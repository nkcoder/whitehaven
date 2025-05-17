import { DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { EitherAsync, Left, Maybe } from "purify-ts";
import { getContracts, getMember } from "./database";
import { getEarlierDateTime, toDate, todayDate } from "./datetime";
import { eventTypes } from "./eventTypes";
import {
  ApiContract,
  apiContractSchema,
  ApiMember,
  apiMemberSchema,
  contractStatusSchema,
  DbContract,
  DbMember,
  memberStatusSchema,
  Message,
  WebhookMemberData,
  webhookMemberDataSchema
} from "./schema";
import { getClient } from "./sqsClient";
import { getQueueUrlByArn } from "./util";
import { callMemberWebhook } from "./webhook";

const getMemberDataForWebhook = (memberId: string): EitherAsync<Error, WebhookMemberData> => {
  return getMember(memberId).ap(
    getContracts(memberId).map((contracts: DbContract[]) => async (member: DbMember) => {
      const apiContracts = await transformToContractApi(contracts);
      const apiMember = transformToApiMember(member, apiContracts);
      return webhookMemberDataSchema.parse({ member: apiMember, contracts: apiContracts });
    })
  );
};

const transformToContractApi = async (contracts: DbContract[]): Promise<ApiContract[]> => {
  return await Promise.all(
    contracts.map(async contract => {
      const expired = isContractExpired(contract.expiryDateTime, contract.endDateTime);

      const status = (() => {
        if (expired) return contractStatusSchema.enum.cancelled;
        return contractStatusSchema.enum.active;
      })();
      return apiContractSchema.parse({ ...contract, status });
    })
  );
};

const transformToApiMember = (member: DbMember, contracts: ApiContract[]): ApiMember => {
  const cancelled = contracts.every(contract => contract.status === contractStatusSchema.enum.cancelled);
  const suspended = contracts.every(contract => contract.status === contractStatusSchema.enum.suspended);
  const isBlocked = Maybe.fromNullable(member.isBlocked).orDefaultLazy(() => false);
  const isOverdue = Maybe.fromNullable(member.outstandingBalance)
    .map(balance => balance > 0)
    .orDefault(false);

  const calculatedStatus = (): string => {
    if (cancelled) return memberStatusSchema.Enum.cancelled;
    if (isBlocked || isOverdue || suspended) return memberStatusSchema.Enum.frozen;
    return memberStatusSchema.Enum.active;
  };

  const status = calculatedStatus();
  return apiMemberSchema.parse({ ...member, status });
};

const isContractExpired = (expiryDateTime: string | null, endDateTime: string | null): boolean => {
  if (!expiryDateTime && !endDateTime) return false;

  const expiryDate = getEarlierDateTime(expiryDateTime, endDateTime).map(toDate);

  return expiryDate.map(expiry => expiry <= todayDate).orDefault(false);
};

const processMessage = (
  message: Message,
  eventSourceARN: string,
  receiptHandle: string
): EitherAsync<Error, string> => {
  const handleMember = () =>
    getMemberDataForWebhook(message.memberId).chain(data => {
      console.log(`Member data before calling webhook: ${JSON.stringify(data)}`);
      return callMemberWebhook(data, eventType);
    });

  const deleteMessage = async () => {
    const deleteResponse = await getClient().send(
      new DeleteMessageCommand({
        QueueUrl: getQueueUrlByArn(eventSourceARN),
        ReceiptHandle: receiptHandle
      })
    );
    console.log(`Deleted the message:${JSON.stringify(message)}, response: ${JSON.stringify(deleteResponse)}`);
    return "Messaged is deleted successfully";
  };

  const eventType = message.eventType as keyof typeof eventTypes;
  const processResponse = Object.values(eventTypes).includes(eventType)
    ? handleMember()
    : EitherAsync.liftEither(Left(new Error("Event type is not supported")));

  return processResponse.map(async () => deleteMessage());
};

export { processMessage };
