import { z } from "zod";
const messageSchema = z.object({
  memberId: z.string(),
  eventType: z.string(),
  contractId: z.string().nullish(),
  prospectId: z.string().nullish(),
  membershipId: z.string().nullish(),
  locationId: z.string().nullish(),
  brandId: z.string().nullish()
});
type Message = z.infer<typeof messageSchema>;

const memberSchema = z.object({
  memberId: z.string(),
  homeLocationId: z.string(),
  email: z.string(),
  mobileNumber: z.string(),
  surname: z.string(),
  givenName: z.string(),
  dob: z.string(),
  gender: z.string().nullish(),
  joinedDateTime: z.string().datetime().nullish(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  country: z.string().nullish(),
  postCode: z.string().or(z.number()).nullish(),
  state: z.string().nullish(),
  suburb: z.string().nullish(),
  isBlocked: z.boolean().default(false),
  outstandingBalance: z.number().default(0)
});
const dbMemberSchema = memberSchema;
const memberStatusSchema = z.enum(["active", "frozen", "cancelled"]);
const apiMemberSchema = memberSchema.extend({
  status: memberStatusSchema.default("active")
});
type Member = z.infer<typeof memberSchema>;
type ApiMember = z.infer<typeof apiMemberSchema>;
type DbMember = z.infer<typeof dbMemberSchema>;
type MemberStatus = z.infer<typeof memberStatusSchema>;

const contractSchema = z.object({
  id: z.string(),
  memberId: z.string(),
  membershipName: z.string().nullish(),
  recurring: z.boolean(),
  membershipId: z.string(),
  description: z.string().optional(),
  costPrice: z.number(),
  createdAt: z.string().datetime(),
  startDateTime: z.string().datetime(),
  expiryDateTime: z.string().datetime().nullish().default(null)
});
const contractStatusSchema = z.enum(["active", "suspended", "cancelled"]);
const dbContractSchema = contractSchema.extend({
  endDateTime: z.string().datetime().nullish().default(null)
});
const apiContractSchema = contractSchema.extend({
  status: contractStatusSchema.default("active")
});
type Contract = z.infer<typeof contractSchema>;
type DbContract = z.infer<typeof dbContractSchema>;
type ApiContract = z.infer<typeof apiContractSchema>;
type ContractStatus = z.infer<typeof contractStatusSchema>;

const dbSuspensionSchema = z.object({
  id: z.string(),
  memberContractId: z.string(),
  memberId: z.string().nullish(),
  suspensionStartDateTime: z.string().datetime(),
  suspensionEndDateTime: z.string().datetime().nullish().default(null),
  cancelledDateTime: z.string().datetime().nullish().default(null)
});
type DbSuspension = z.infer<typeof dbSuspensionSchema>;

const keepMeMemberDataSchema = z.object({
  member: apiMemberSchema,
  contracts: z.array(apiContractSchema)
});
type KeepMeMemberData = z.infer<typeof keepMeMemberDataSchema>;

const prospectSchema = z.object({
  dob: z.string().date(),
  country: z.string().nullish(),
  email: z.string(),
  gender: z.string(),
  memberId: z.string(),
  locationId: z.string().nullish(),
  membershipId: z.string().nullish(),
  membershipName: z.string().nullish(),
  state: z.string().nullish(),
  createdAt: z.string().datetime(),
  suburb: z.string().nullish()
});
const dbProspectSchema = prospectSchema.extend({
  id: z.string(),
  address: z.string().nullish(),
  givenName: z.string(),
  surname: z.string(),
  mobileNumber: z.string(),
  postCode: z.string().or(z.number())
});
type DbProspect = z.infer<typeof dbProspectSchema>;

const keepMeProspectDataSchema = prospectSchema.extend({
  venueName: z.string(),
  sourceGroup: z.string(),
  sourceName: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  prospectId: z.string(),
  zip: z.string().nullish()
});
type KeepmeProspectData = z.infer<typeof keepMeProspectDataSchema>;

export {
  messageSchema,
  Message,
  memberSchema,
  Member,
  apiMemberSchema,
  ApiMember,
  dbMemberSchema,
  DbMember,
  MemberStatus,
  dbContractSchema,
  DbContract,
  apiContractSchema,
  ApiContract,
  contractSchema,
  Contract,
  ContractStatus,
  dbSuspensionSchema,
  DbSuspension,
  keepMeMemberDataSchema,
  KeepMeMemberData,
  contractStatusSchema,
  memberStatusSchema,
  dbProspectSchema,
  DbProspect,
  keepMeProspectDataSchema,
  KeepmeProspectData
};
