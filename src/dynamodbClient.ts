import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const getClient = (): DynamoDBDocumentClient => {
  const region = process.env.AWS_REGION || "ap-southeast-2";
  const client = new DynamoDBClient({ region });
  return DynamoDBDocumentClient.from(client);
};

export { getClient };
