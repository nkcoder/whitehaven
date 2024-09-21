import {
  DbSuspension,
  dbSuspensionSchema,
  dbMemberSchema,
  DbMember,
  dbContractSchema,
  DbContract,
  DbProspect,
  dbProspectSchema
} from "./schema";
import { EitherAsync, Maybe } from "purify-ts";
import { getClient } from "./dynamodbClient";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const getMember = (memberId: string): EitherAsync<Error, DbMember> => {
  const memberTable = process.env.MEMBER_TABLE;
  return EitherAsync(async ({ throwE }) => {
    try {
      const getCommand = new GetCommand({
        TableName: memberTable,
        Key: {
          memberId: memberId
        },
        ProjectionExpression:
          "memberId, homeLocationId, email, mobileNumber, surname, givenName, dob, gender, joinedDateTime, createdAt, updatedAt, country, postCode, #s, suburb, isBlocked, outstandingBalance",
        ExpressionAttributeNames: {
          "#s": "state"
        }
      });

      const result = await getClient().send(getCommand);
      const maybeMember = Maybe.fromNullable(result.Item);

      return maybeMember.caseOf({
        Just: member => {
          console.log(`Retrieved member: ${JSON.stringify(member)}`);
          return dbMemberSchema.parse(member);
        },
        Nothing: () => throwE(new Error(`Member with memberId ${memberId} not found`))
      });
    } catch (error) {
      console.error(`Error retrieving member with memberId ${memberId}: ${error}`);
      return throwE(new Error(`Error retrieving member with memberId ${memberId}: ${error}`));
    }
  });
};

const getContracts = (memberId: string): EitherAsync<Error, DbContract[]> => {
  const contractTable = process.env.CONTRACT_TABLE;
  return EitherAsync(async ({ throwE }) => {
    try {
      const queryCommand = new QueryCommand({
        TableName: contractTable,
        IndexName: "byMemberId",
        KeyConditionExpression: "memberId = :memberId",
        ExpressionAttributeValues: {
          ":memberId": memberId
        },
        ProjectionExpression:
          "id, memberId, membershipName, recurring, membershipId, costPrice, createdAt, startDateTime, endDateTime, expiryDateTime"
      });

      const result = await getClient().send(queryCommand);
      console.log(`Retrieved contracts result: ${JSON.stringify(result)}`);
      return Maybe.fromNullable(result.Items)
        .map(items => items.map(contract => dbContractSchema.parse(contract)))
        .orDefaultLazy(() => []);
    } catch (error) {
      console.error(`Error retrieving contracts for memberId ${memberId}: ${error}`);
      return throwE(new Error(`Error retrieving contracts for memberId ${memberId}: ${error}`));
    }
  });
};

const getActiveSuspensions = (contractId: string): EitherAsync<Error, DbSuspension[]> => {
  const suspensionTable = process.env.SUSPENSION_TABLE;
  return EitherAsync(async ({ throwE }) => {
    try {
      const queryCommand = new QueryCommand({
        TableName: suspensionTable,
        IndexName: "byMemberContractId",
        KeyConditionExpression: "memberContractId = :contractId",
        FilterExpression:
          "suspensionStartDateTime < :now AND (suspensionEndDateTime > :now OR suspensionEndDateTime = :null) AND (attribute_not_exists(cancelledDateTime) OR cancelledDateTime = :null)",
        ExpressionAttributeValues: {
          ":contractId": contractId,
          ":now": new Date().toISOString(),
          ":null": null
        },
        ProjectionExpression:
          "id, memberContractId, memberId, suspensionStartDateTime, suspensionEndDateTime, cancelledDateTime"
      });

      const result = await getClient().send(queryCommand);
      console.log(`Retrieved active suspensions result: ${JSON.stringify(result)}`);
      return Maybe.fromNullable(result.Items)
        .map(items => items.map(suspension => dbSuspensionSchema.parse(suspension)))
        .orDefaultLazy(() => []);
    } catch (error) {
      console.error(`Error retrieving active suspensions for contractId ${contractId}: ${error}`);
      return throwE(new Error(`Error retrieving active suspensions for contractId ${contractId}: ${error}`));
    }
  });
};

const getProspect = (prospectId: string): EitherAsync<Error, DbProspect> => {
  const prospectTable = process.env.PROSPECT_TABLE;

  return EitherAsync(async ({ throwE }) => {
    try {
      const getCommand = new GetCommand({
        TableName: prospectTable,
        Key: {
          id: prospectId
        },
        ProjectionExpression:
          "id, address, givenName, surname, mobileNumber, postCode, dob, country, email, gender, memberId, locationId, membershipId, membershipName, #s, suburb, createdAt",
        ExpressionAttributeNames: {
          "#s": "state"
        }
      });
      const result = await getClient().send(getCommand);
      const maybeProspect = Maybe.fromNullable(result.Item);

      return maybeProspect.caseOf({
        Just: prospect => {
          console.log(`Retrieved prospect: ${JSON.stringify(prospect)}`);
          return dbProspectSchema.parse(prospect);
        },
        Nothing: () => throwE(new Error(`Prospect with id ${prospectId} not found`))
      });
    } catch (error) {
      console.error(`Error retrieving prospect with prospectId ${prospectId}: ${error}`);
      return throwE(new Error(`Error retrieving prospect with prospectId ${prospectId}: ${error}`));
    }
  });
};

export { getMember, getContracts, getActiveSuspensions, getProspect };
