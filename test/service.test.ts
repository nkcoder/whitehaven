import { beforeEach } from "node:test";
import type { SQSClient } from "@aws-sdk/client-sqs";
import { EitherAsync, Left } from "purify-ts";
import { describe, expect, it, vi } from "vitest";
import { getContracts, getMember } from "../src/database.js";
import { eventTypes } from "../src/eventTypes.js";
import {
  type DbContract,
  type DbMember,
  type Message,
  memberStatusSchema,
  type WebhookMemberData
} from "../src/schema.js";
import { processMessage } from "../src/service.js";
import { getClient } from "../src/sqsClient.js";
import { callMemberWebhook } from "../src/webhook.js";

describe("processMessage", () => {
  vi.mock("../src/database.ts");
  vi.mock("../src/webhook.ts");
  vi.mock("../src/sqsClient.ts");

  const eventSourceARN = "test-event-source-arn";
  const receiptHandle = "test-receipt-handle";

  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(callMemberWebhook).mockReset();
    vi.mocked(getMember).mockReset();
    vi.mocked(getContracts).mockReset();
    vi.mocked(getClient).mockReset();
  });

  it("should handle member messages (with expired contracts) correctly", async () => {
    const mockMemberData = {
      memberId: "123",
      homeLocationId: "loc_456",
      email: "123@example.com",
      mobileNumber: "+61456789876",
      surname: "Daniel",
      givenName: "Ted",
      dob: "1990-09-09",
      gender: "MALE",
      joinedDateTime: "2021-01-01T00:00:00Z",
      createdAt: "2021-01-01T00:00:00Z",
      updatedAt: "2021-01-01T00:00:00Z",
      country: "Australia",
      postCode: "2000",
      state: "NSW",
      suburb: "Sydney"
    } as DbMember;
    const mockContracts = [
      {
        id: "id111",
        memberId: "123",
        membershipName: "Flex 2",
        recurring: true,
        membershipId: "mem_456",
        description: "Flex 2 membership",
        costPrice: 12.34,
        createdAt: "2021-01-01T00:00:00Z",
        startDateTime: "2021-01-01T00:00:00Z",
        endDateTime: "2022-01-01T00:00:00Z",
        expiryDateTime: "2022-01-01T00:00:00Z"
      } as DbContract
    ];

    const mockWebhookResponse = "Webhook called successfully";
    vi.mocked(getMember).mockImplementation(() => EitherAsync<Error, DbMember>(() => Promise.resolve(mockMemberData)));
    vi.mocked(getContracts).mockImplementation(() =>
      EitherAsync<Error, DbContract[]>(() => Promise.resolve(mockContracts))
    );
    vi.mocked(callMemberWebhook).mockImplementation(() =>
      EitherAsync<Error, string>(() => Promise.resolve(mockWebhookResponse))
    );
    // mock the sqs client
    const mockSQSClient = {
      config: {},
      destroy: vi.fn(),
      middlewareStack: {},
      send: vi.fn(),
      deleteMessage: vi.fn().mockImplementation(() => Promise.resolve())
    } as unknown as SQSClient;
    vi.mocked(getClient).mockImplementation(() => mockSQSClient);

    const message = {
      eventType: eventTypes.MEMBER_OVERDUE,
      memberId: "12345"
    } as Message;
    const result = await processMessage(message, eventSourceARN, receiptHandle).run();
    expect(result.isRight()).toBe(true);
    expect(result.extract()).toEqual("Messaged is deleted successfully");
  });

  it("should handle member messages (with active contracts) correctly", async () => {
    const mockMemberData = {
      memberId: "123",
      homeLocationId: "loc_456",
      email: "123@example.com",
      mobileNumber: "+61456789876",
      surname: "Daniel",
      givenName: "Ted",
      dob: "1990-09-09",
      gender: "MALE",
      joinedDateTime: "2021-01-01T00:00:00Z",
      createdAt: "2021-01-01T00:00:00Z",
      updatedAt: "2021-01-01T00:00:00Z",
      country: "Australia",
      postCode: "2000",
      state: "NSW",
      suburb: "Sydney"
    } as DbMember;
    const mockContracts = [
      {
        id: "id111",
        memberId: "123",
        membershipName: "Flex 2",
        recurring: true,
        membershipId: "mem_456",
        description: "Flex 2 membership",
        costPrice: 12.34,
        createdAt: "2021-01-01T00:00:00Z",
        startDateTime: "2021-01-01T00:00:00Z",
        endDateTime: null,
        expiryDateTime: null
      } as DbContract
    ];

    const mockSQSClient = {
      config: {},
      destroy: vi.fn(),
      middlewareStack: {},
      send: vi.fn(),
      deleteMessage: vi.fn().mockImplementation(() => Promise.resolve())
    } as unknown as SQSClient;
    vi.mocked(getClient).mockImplementation(() => mockSQSClient);

    const mockWebhookResponse = "Webhook called successfully";
    vi.mocked(getMember).mockImplementation(() => EitherAsync<Error, DbMember>(() => Promise.resolve(mockMemberData)));
    vi.mocked(getContracts).mockImplementation(() =>
      EitherAsync<Error, DbContract[]>(() => Promise.resolve(mockContracts))
    );
    vi.mocked(callMemberWebhook).mockImplementation(() =>
      EitherAsync<Error, string>(() => Promise.resolve(mockWebhookResponse))
    );

    const message = {
      eventType: eventTypes.MEMBER_OVERDUE,
      memberId: "12345"
    } as Message;
    const result = await processMessage(message, eventSourceARN, receiptHandle).run();
    expect(result.isRight()).toBe(true);
    expect(result.extract()).toEqual("Messaged is deleted successfully");
  });

  it("should return an error if member is not found", async () => {
    const message = {
      eventType: eventTypes.MEMBER_OVERDUE,
      memberId: "not-exist-id"
    } as Message;

    vi.mocked(getMember).mockReturnValue(
      EitherAsync<Error, DbMember>(() => Promise.reject(new Error("Member not found")))
    );

    const result = await processMessage(message, eventSourceARN, receiptHandle).run();
    expect(result.isLeft()).toBe(true);
    expect(result).toEqual(Left(new Error("Member not found")));
  });

  it("should return an error if event type is not supported", async () => {
    const message = {
      eventType: "not-supported-event-type",
      memberId: "12345"
    } as Message;

    const result = await processMessage(message, eventSourceARN, receiptHandle).run();
    expect(result.isLeft()).toBe(true);
    expect(result).toEqual(Left(new Error("Event type is not supported")));
  });

  it("should set member status to frozen when outstandingBalance > 0", async () => {
    const mockMemberData: DbMember = {
      memberId: "overdue-member-456",
      homeLocationId: "loc_abc",
      email: "overdue@example.com",
      mobileNumber: "+61444555666",
      surname: "Overdue",
      givenName: "User",
      dob: "1990-02-20",
      createdAt: "2021-01-01T00:00:00Z",
      updatedAt: "2021-01-01T00:00:00Z",
      isBlocked: false,
      outstandingBalance: 50.75 // Is Overdue
    };

    const mockContracts: DbContract[] = [
      {
        // Active contract to ensure member is not 'cancelled'
        id: "contract-overdue-1",
        memberId: "overdue-member-456",
        membershipName: "Standard Plan",
        recurring: true,
        membershipId: "mem_standard",
        costPrice: 25.0,
        createdAt: "2021-01-01T00:00:00Z",
        startDateTime: "2021-01-01T00:00:00Z",
        endDateTime: null,
        expiryDateTime: null
      }
    ];

    vi.mocked(getMember).mockReturnValue(EitherAsync<Error, DbMember>(() => Promise.resolve(mockMemberData)));
    vi.mocked(getContracts).mockReturnValue(EitherAsync<Error, DbContract[]>(() => Promise.resolve(mockContracts)));

    const mockWebhookResponse = "Webhook called successfully for overdue member";
    vi.mocked(callMemberWebhook).mockImplementation((data: WebhookMemberData, _eventType: string) => {
      expect(data.member.status).toBe(memberStatusSchema.enum.frozen);
      return EitherAsync<Error, string>(() => Promise.resolve(mockWebhookResponse));
    });

    const mockSQSClient = { send: vi.fn().mockResolvedValue({}) } as unknown as SQSClient;
    vi.mocked(getClient).mockReturnValue(mockSQSClient);

    const message: Message = {
      eventType: eventTypes.MEMBER_OVERDUE,
      memberId: "overdue-member-456"
    };

    const result = await processMessage(message, eventSourceARN, receiptHandle).run();

    expect(result.isRight()).toBe(true);
    expect(result.extract()).toEqual("Messaged is deleted successfully");
  });

  it("should set member status to active when outstanding balance is 0 and other conditions are met", async () => {
    const mockMemberData: DbMember = {
      memberId: "no-balance-member-789",
      homeLocationId: "loc_def",
      email: "nobalance@example.com",
      mobileNumber: "+61477888999",
      surname: "NoBalance",
      givenName: "User",
      dob: "1992-03-25",
      createdAt: "2022-01-01T00:00:00Z",
      updatedAt: "2022-01-01T00:00:00Z",
      isBlocked: false,
      outstandingBalance: 0 // Is not Overdue
    };

    const mockContracts: DbContract[] = [
      {
        // Active contract
        id: "contract-nobalance-1",
        memberId: "no-balance-member-789",
        membershipName: "Free Plan",
        recurring: false,
        membershipId: "mem_free",
        costPrice: 0.0,
        createdAt: "2022-01-01T00:00:00Z",
        startDateTime: "2022-01-01T00:00:00Z",
        endDateTime: null,
        expiryDateTime: null
      }
    ];

    vi.mocked(getMember).mockReturnValue(EitherAsync<Error, DbMember>(() => Promise.resolve(mockMemberData)));
    vi.mocked(getContracts).mockReturnValue(EitherAsync<Error, DbContract[]>(() => Promise.resolve(mockContracts)));

    const mockWebhookResponse = "Webhook called successfully for no-balance member";
    vi.mocked(callMemberWebhook).mockImplementation((data: WebhookMemberData, _eventType: string) => {
      expect(data.member.status).toBe(memberStatusSchema.enum.active);
      return EitherAsync<Error, string>(() => Promise.resolve(mockWebhookResponse));
    });

    const mockSQSClient = { send: vi.fn().mockResolvedValue({}) } as unknown as SQSClient;
    vi.mocked(getClient).mockReturnValue(mockSQSClient);

    const message: Message = {
      eventType: eventTypes.MEMBER_JOINED,
      memberId: "no-balance-member-789"
    };

    const result = await processMessage(message, eventSourceARN, receiptHandle).run();

    expect(result.isRight()).toBe(true);
    expect(result.extract()).toEqual("Messaged is deleted successfully");
  });
});
