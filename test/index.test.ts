import { describe, it, expect, beforeEach, vi } from "vitest";
import { handler } from "../src/index";
import { callMemberWebhook } from "../src/webhook";
import { EitherAsync } from "purify-ts";
import { SQSEvent } from "aws-lambda";
import { ApiContract, ApiMember, Message } from "../src/schema";
import { memberEventType } from "../src/memberEventTypes";
import { processMessage } from "../src/service";
import { M } from "vitest/dist/chunks/reporters.C_zwCd4j";

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
              eventType: memberEventType.MEMBER_JOINED
            })
          })
        }
      ]
    } as unknown as SQSEvent;

    vi.mocked(processMessage).mockReturnValue(EitherAsync(() => Promise.resolve("Member message processed")));

    const result = await handler(mockEvent);

    const message: Message = { memberId: "123", eventType: memberEventType.MEMBER_JOINED };
    expect(processMessage).toHaveBeenCalledWith(message);
    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify("All webhook responses successful")
    });
  });

  it("should process the prospect event", async () => {
    const mockEvent = {
      Records: [
        {
          body: JSON.stringify({
            Message: JSON.stringify({
              prospectId: "456",
              memberId: "123",
              eventType: memberEventType.MEMBER_PROSPECT
            })
          })
        }
      ]
    } as unknown as SQSEvent;

    vi.mocked(processMessage).mockReturnValue(EitherAsync(() => Promise.resolve("Prospect message processed")));

    const result = await handler(mockEvent);

    const message: Message = { prospectId: "456", memberId: "123", eventType: memberEventType.MEMBER_PROSPECT };
    expect(processMessage).toHaveBeenCalledWith(message);
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
              eventType: memberEventType.MEMBER_OVERDUE,
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
              eventType: memberEventType.MEMBER_JOINED
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
              eventType: memberEventType.MEMBER_JOINED
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
