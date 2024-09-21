import { SQSEvent, SQSRecord } from "aws-lambda";
import { EitherAsync } from "purify-ts";
import { Message, messageSchema } from "./schema";
import { processMessage } from "./service";

/**
 * Check `sqs_event_sample.json` for the structure of the event
 *
 * @param event
 * @returns
 */
const handler = async (event: SQSEvent) => {
  console.log(`Received event: ${JSON.stringify(event)}`);

  const webhookResponses = event.Records.map((record: SQSRecord) => {
    console.log(`Processing the record: ${JSON.stringify(record)}`);
    const recordBody = JSON.parse(record.body);
    const recordMessage = JSON.parse(recordBody.Message);
    const message: Message = messageSchema.parse(recordMessage);
    console.log(`Processing the message: ${JSON.stringify(message)}`);

    return processMessage(message);
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
    Left: error => {
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
