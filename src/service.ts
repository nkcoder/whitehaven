import { EitherAsync, Left, Maybe } from "purify-ts";
import { getEarlierDateTime, toDate, todayDate } from "./datetime";
import { eventTypes } from "./eventTypes";
import { DeleteMessageCommand } from "@aws-sdk/client-sqs";
import {
  ApiContract,
  apiContractSchema,
  ApiMember,
  apiMemberSchema,
  contractStatusSchema,
  DbContract,
  DbMember,
  WebhookMemberData,
  webhookMemberDataSchema,
  webhookProspectDataSchema,
  WebhookProspectData,
  memberStatusSchema,
  Message
} from "./schema";
import { getContracts, getMember, getProspect } from "./database";
import { callMemberWebhook, callProspectWebhook } from "./webhook";
import { getClient } from "./sqsClient";
import { getQueueUrlByArn } from "./util";

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

const getProspectDataForWebhook = (prospectId: string): EitherAsync<Error, WebhookProspectData> => {
  return getProspect(prospectId).map(prospect => {
    const prospectForWebhook = {
      venueName: prospect.locationId,
      sourceGroup: "web",
      sourceName: "Abandoned Cart",
      firstName: prospect.givenName,
      lastName: prospect.surname,
      phone: prospect.mobileNumber,
      prospectId: prospect.id,
      zip: prospect.postCode + "",
      state: prospect.state,
      dob: prospect.dob,
      country: prospect.country,
      email: prospect.email,
      gender: prospect.gender,
      memberId: prospect.memberId,
      membershipId: prospect.membershipId,
      membershipName: prospect.membershipName,
      suburb: prospect.suburb,
      createdAt: prospect.createdAt
    };
    return webhookProspectDataSchema.parse(prospectForWebhook);
  });
};

const processMessage = (
  message: Message,
  eventSourceARN: string,
  receiptHandle: string
): EitherAsync<Error, string> => {
  const handleProspect = (id: string) =>
    getProspectDataForWebhook(id).chain(data => {
      console.log(`Prospect data before calling webhook: ${JSON.stringify(data)}`);
      return callProspectWebhook(data);
    });

  const handleMember = () =>
    getMemberDataForWebhook(message.memberId).chain(data => {
      console.log(`Member data before calling webhook: ${JSON.stringify(data)}`);
      return callMemberWebhook(data, message.eventType);
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

  const processResponse =
    message.eventType === eventTypes.MEMBER_PROSPECT
      ? Maybe.fromNullable(message.prospectId)
          .map(handleProspect)
          .orDefault(EitherAsync.liftEither(Left(new Error("ProspectId is missing in the message"))))
      : handleMember();

  return processResponse.map(async () => deleteMessage());
};

export { processMessage };
