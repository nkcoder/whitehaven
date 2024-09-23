import { EitherAsync, Left, Maybe } from "purify-ts";
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
  KeepMeMemberData,
  keepMeMemberDataSchema,
  KeepmeProspectData,
  keepMeProspectDataSchema,
  memberStatusSchema,
  Message
} from "./schema";
import { getContracts, getMember, getProspect } from "./database";
import { callMemberWebhook, callProspectWebhook } from "./webhook";

const getMemberDataForKeepMe = (memberId: string): EitherAsync<Error, KeepMeMemberData> => {
  return getMember(memberId).ap(
    getContracts(memberId).map((contracts: DbContract[]) => async (member: DbMember) => {
      const apiContracts = await transformToContractApi(contracts);
      const apiMember = transformToApiMember(member, apiContracts);
      return keepMeMemberDataSchema.parse({ member: apiMember, contracts: apiContracts });
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

const getProspectDataForKeepMe = (prospectId: string): EitherAsync<Error, KeepmeProspectData> => {
  return getProspect(prospectId).map(prospect => {
    const prospectForKeepme = {
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
    return keepMeProspectDataSchema.parse(prospectForKeepme);
  });
};

const processMessage = (message: Message): EitherAsync<Error, string> => {
  const handleProspect = (id: string) =>
    getProspectDataForKeepMe(id).chain(data => {
      console.log(`Prospect data for KeepMe before calling webhook: ${JSON.stringify(data)}`);
      return callProspectWebhook(data);
    });

  const handleMember = () =>
    getMemberDataForKeepMe(message.memberId).chain(data => {
      console.log(`Member data for KeepMe before calling webhook: ${JSON.stringify(data)}`);
      return callMemberWebhook(data, message.eventType);
    });

  return message.eventType === eventTypes.MEMBER_PROSPECT
    ? Maybe.fromNullable(message.prospectId)
        .map(handleProspect)
        .orDefault(EitherAsync.liftEither(Left(new Error("ProspectId is missing in the message"))))
    : handleMember();
};

export { processMessage };
