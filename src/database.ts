import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { EitherAsync, Maybe } from "purify-ts";
import { getClient } from "./dynamodbClient.js";
import { type DbContract, type DbMember, dbContractSchema, dbMemberSchema } from "./schema.js";

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
  const tableName = process.env.CONTRACT_TABLE;
  return EitherAsync<Error, DbContract[]>(async () => {
    try {
      if (!tableName) {
        throw new Error("CONTRACT_TABLE is not set");
      }

      const params = {
        TableName: tableName,
        KeyConditionExpression: "memberId = :mid",
        ExpressionAttributeValues: {
          ":mid": memberId
        }
      };

      const command = new QueryCommand(params);
      const response = await getClient().send(command);
      const items = response.Items || [];

      return items.length === 0 ? [] : items.map(contract => dbContractSchema.parse(contract));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);

      throw new Error(`Error retrieving contracts for memberId ${memberId}: ${errMsg}`);
    }
  });
};

export { getContracts, getMember };
