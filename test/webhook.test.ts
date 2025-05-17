import ky from "ky";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventTypes } from "../src/eventTypes";
import { ApiContract, ApiMember, WebhookMemberData } from "../src/schema";
import { convertKeysToSnakeCase } from "../src/util";
import { callMemberWebhook } from "../src/webhook";

vi.mock("ky");

describe("webhook", () => {
  const mockMemberWebhookUrl = "https://example.com/webhook_member";
  const mockProspectWebhookUrl = "https://example.com/webhook_prospect";

  beforeEach(() => {
    process.env.WEBHOOK_MEMBER_URL = mockMemberWebhookUrl;
    process.env.WEBHOOK_PROSPECT_URL = mockProspectWebhookUrl;
    vi.resetAllMocks();
  });

  describe("callMemberWebhook", () => {
    const mockMemberData: WebhookMemberData = {
      member: {
        memberId: "123",
        homeLocationId: "loc_456",
        email: "123@example.com",
        mobileNumber: "+61456789876",
        surname: "Daniel",
        givenName: "Ted",
        dob: "1990-09-09",
        gender: "MALE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as ApiMember,
      contracts: [
        {
          memberId: "123",
          membershipName: "Flex 2",
          recurring: true,
          membershipId: "mem_456",
          description: "Flex 2 membership",
          costPrice: 12.34,
          createdAt: new Date().toISOString(),
          startDateTime: new Date().toISOString()
        } as ApiContract
      ]
    };

    it("should successfully call webhook for MEMBER_JOINED event", async () => {
      // We need to create a response that matches what ky expects
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true })
      };

      // @ts-expect-error - Mock response doesn't need to implement the full Response interface
      vi.mocked(ky.post).mockResolvedValue(mockResponse);

      const result = await callMemberWebhook(mockMemberData, eventTypes.MEMBER_JOINED).run();

      expect(result.isRight()).toBe(true);
      expect(ky.post).toHaveBeenCalledWith(mockMemberWebhookUrl, {
        json: {
          type: "joiner",
          description: eventTypes.MEMBER_JOINED,
          data: convertKeysToSnakeCase(mockMemberData)
        }
      });
    });

    it("should successfully call webhook for STATUS_UPDATE event", async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true })
      };

      // @ts-expect-error - Mock response doesn't need to implement the full Response interface
      vi.mocked(ky.post).mockResolvedValue(mockResponse);

      const result = await callMemberWebhook(mockMemberData, eventTypes.CANCELLATION_CREATED).run();

      expect(result.isRight()).toBe(true);
      expect(ky.post).toHaveBeenCalledWith(mockMemberWebhookUrl, {
        json: {
          type: "status-update",
          description: eventTypes.CANCELLATION_CREATED,
          data: convertKeysToSnakeCase(mockMemberData)
        }
      });
    });

    it("should return an error when webhook call fails", async () => {
      const mockResponse = {
        ok: false,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({})
      };

      // @ts-expect-error - Mock response doesn't need to implement the full Response interface
      vi.mocked(ky.post).mockResolvedValue(mockResponse);

      const result = await callMemberWebhook(mockMemberData, eventTypes.MEMBER_JOINED).run();

      expect(result.isLeft()).toBe(true);
      expect(result.leftOrDefault(new Error()).message).toBe("Failed to send webhook: Internal Server Error");
    });

    it("should return an error when WEBHOOK_URL is not set", async () => {
      process.env.WEBHOOK_MEMBER_URL = "";

      const result = await callMemberWebhook(mockMemberData, eventTypes.MEMBER_JOINED).run();

      expect(result.isLeft()).toBe(true);
      expect(result.extract().toString()).toBe("Error: Webhook URL is not set");
      expect(ky.post).not.toHaveBeenCalled();
    });
  });
});
