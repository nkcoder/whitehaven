import { describe, it, expect, beforeEach, vi } from "vitest";
import { callMemberWebhook, callProspectWebhook } from "../src/webhook";
import { ApiContract, ApiMember, WebhookMemberData, WebhookProspectData } from "../src/schema";
import { eventTypes } from "../src/eventTypes";
import ky from "ky";
import { convertKeysToSnakeCase } from "../src/util";

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
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ success: true }) };
      vi.mocked(ky.post).mockResolvedValue(mockResponse as any);

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
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ success: true }) };
      vi.mocked(ky.post).mockResolvedValue(mockResponse as any);

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
      const mockResponse = { ok: false, statusText: "Internal Server Error" };
      vi.mocked(ky.post).mockResolvedValue(mockResponse as any);

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

  describe("callProspectWebhook", () => {
    const mockProspectData = {
      venueName: "Venue",
      sourceGroup: "Group",
      sourceName: "Name",
      firstName: "John",
      lastName: "Doe",
      phone: "+61456789876",
      prospectId: "123",
      dob: "1990-09-09",
      country: "AU",
      email: "test@x.com",
      gender: "Male",
      memberId: "234"
    } as WebhookProspectData;

    it("should successfully call webhook for MEMBER_JOINED event", async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ success: true }) };
      vi.mocked(ky.post).mockResolvedValue(mockResponse as any);

      const result = await callProspectWebhook(mockProspectData).run();

      expect(result.isRight()).toBe(true);
      expect(ky.post).toHaveBeenCalledWith(mockProspectWebhookUrl, {
        json: convertKeysToSnakeCase(mockProspectData)
      });
    });

    it("should successfully call webhook for STATUS_UPDATE event", async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ success: true }) };
      vi.mocked(ky.post).mockResolvedValue(mockResponse as any);

      const result = await callProspectWebhook(mockProspectData).run();

      expect(result.isRight()).toBe(true);
      expect(ky.post).toHaveBeenCalledWith(mockProspectWebhookUrl, {
        json: convertKeysToSnakeCase(mockProspectData)
      });
    });

    it("should return an error when webhook call fails", async () => {
      const mockResponse = { ok: false, statusText: "Internal Server Error" };
      vi.mocked(ky.post).mockResolvedValue(mockResponse as any);

      const result = await callProspectWebhook(mockProspectData).run();

      expect(result.isLeft()).toBe(true);
      expect(result.leftOrDefault(new Error()).message).toBe("Failed to send webhook: Internal Server Error");
    });

    it("should return an error when WEBHOOK_URL is not set", async () => {
      process.env.WEBHOOK_PROSPECT_URL = "";

      const result = await callProspectWebhook(mockProspectData).run();

      expect(result.isLeft()).toBe(true);
      expect(result.extract().toString()).toBe("Error: Webhook URL is not set");
      expect(ky.post).not.toHaveBeenCalled();
    });
  });
});
