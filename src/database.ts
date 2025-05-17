import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { EitherAsync, Maybe } from "purify-ts";
import { getClient } from "./dynamodbClient";
import { DbContract, DbMember, dbContractSchema, dbMemberSchema } from "./schema";

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

export { getContracts, getMember };
