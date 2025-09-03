import type { SQSEvent } from "aws-lambda";
import { EitherAsync } from "purify-ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventTypes } from "../src/eventTypes.js";
import { handler } from "../src/index.js";
import type { Message } from "../src/schema.js";
import { processMessage } from "../src/service.js";

// Mock the dependencies
vi.mock("../src/webhook");
vi.mock("../src/service");

describe("handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process the member event", async () => {
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            Message: JSON.stringify({
              memberId: "123",
              eventType: eventTypes.MEMBER_JOINED
            })
          }),
          eventSourceARN: "test-event-source-arn",
          receiptHandle: "test-receipt-handle"
        }
      ]
    } as unknown as SQSEvent;

    vi.mocked(processMessage).mockReturnValue(EitherAsync(() => Promise.resolve("Member message processed")));

    const result = await handler(mockEvent);

    const message: Message = { memberId: "123", eventType: eventTypes.MEMBER_JOINED };
    expect(processMessage).toHaveBeenCalledWith(message, "test-event-source-arn", "test-receipt-handle");
    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify("All webhook responses successful")
    });
  });

  it("should return error if member message cannot be processed", async () => {
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            Message: JSON.stringify({
              eventType: eventTypes.MEMBER_OVERDUE,
              memberId: "123"
            })
          })
        }
      ]
    } as unknown as SQSEvent;

    vi.mocked(processMessage).mockReturnValue(EitherAsync(() => Promise.reject(new Error("Invalid message"))));

    await expect(handler(mockEvent)).rejects.toThrow("Invalid message");
  });

  it("should return error if webhook URL is not set in non dev env", async () => {
    process.env.ENV = "prod";
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            Message: JSON.stringify({
              memberId: "123",
              eventType: eventTypes.MEMBER_JOINED
            })
          })
        }
      ]
    } as unknown as SQSEvent;

    vi.mocked(processMessage).mockReturnValue(EitherAsync(() => Promise.reject(new Error("Webhook URL is not set"))));

    await expect(handler(mockEvent)).rejects.toThrow("Webhook URL is not set");
  });

  it("should return 501 status code if webhook URL is not set in dev env", async () => {
    process.env.ENV = "dev";
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            Message: JSON.stringify({
              memberId: "123",
              eventType: eventTypes.MEMBER_JOINED
            })
          })
        }
      ]
    } as unknown as SQSEvent;

    vi.mocked(processMessage).mockReturnValue(EitherAsync(() => Promise.reject(new Error("Webhook URL is not set"))));

    const result = await handler(mockEvent);

    expect(result).toEqual({
      statusCode: 501,
      body: JSON.stringify("Webhook URL is not set in dev environment, skipping the webhook call")
    });
  });
});
