import { SQSClient } from "@aws-sdk/client-sqs";

const sqsClient: SQSClient | null = null;

const getClient = () => {
  if (!sqsClient) {
    const region = process.env.AWS_REGION || "ap-southeast-2";
    return new SQSClient({ region });
  }
  return sqsClient;
};

export { getClient };
