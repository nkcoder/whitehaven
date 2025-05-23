import { SQSEvent, SQSRecord } from "aws-lambda";
import { EitherAsync } from "purify-ts";
import { Message, sqsRecordBodySchema } from "./schema.js";
import { processMessage } from "./service.js";

/**
 * Check `docs/sqs_event_sample.json` for the structure of the event
 *
 * @param event
 * @returns
 */
const handler = async (event: SQSEvent) => {
  console.log(`Received event: ${JSON.stringify(event)}`);

  const webhookResponses = event.Records.map((record: SQSRecord) => {
    console.log(`Processing the record: ${JSON.stringify(record)}`);
    const { body, eventSourceARN, receiptHandle } = record;

    console.log(`Record body: ${body}`);
    const sqsRecordBody = sqsRecordBodySchema.parse(JSON.parse(body));
    const message: Message = sqsRecordBody.Message;
    console.log(`Processing the message: ${JSON.stringify(message)}`);

    return processMessage(message, eventSourceARN, receiptHandle);
  });

  const combined = await EitherAsync.sequence(webhookResponses);
  return combined.caseOf({
    Right: () => {
      console.log("All webhook responses successful");
      return {
        statusCode: 200,
        body: JSON.stringify("All webhook responses successful")
      };
    },
    // the message will retain in the queue and will be retried later
    Left: (error: Error) => {
      console.error(`Webhook error: ${error}, message: ${error.message}, env: ${process.env.ENV}`);
      if (error.message === "Webhook URL is not set" && process.env.ENV === "dev") {
        console.warn("Webhook URL is not set in dev environment, skipping the webhook call");
        return {
          statusCode: 501,
          body: JSON.stringify("Webhook URL is not set in dev environment, skipping the webhook call")
        };
      } else {
        console.error(`Webhook error: ${error}`);
        throw error;
      }
    }
  });
};

export { handler };
