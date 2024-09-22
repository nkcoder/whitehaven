import { EitherAsync, Left } from "purify-ts";
import { describe, expect, it, vi } from "vitest";
import { getContracts, getMember, getProspect } from "../src/database";
import { DbContract, DbMember, DbProspect, Message } from "../src/schema";
import { processMessage } from "../src/service";
import { callMemberWebhook, callProspectWebhook } from "../src/webhook";
import { memberEventType } from "../src/memberEventTypes";

describe("processMessage", () => {
  vi.mock("../src/database.ts");
  vi.mock("../src/webhook.ts");

  it("should handle prospect messages correctly", async () => {
    const mockProspectData = {
      id: "p111",
      givenName: "John",
      surname: "Doe",
      mobileNumber: "+61456789876",
      postCode: "2900",
      dob: "1990-09-09",
      email: "test_123@test.com",
      gender: "private",
      memberId: "m123",
      locationId: "loc_456",
      membershipId: "ms_789",
      membershipName: "Membership 1",
      state: "ACT",
      createdAt: "2021-01-01T00:00:00Z"
    } as DbProspect;
    const mockWebhookResponse = "Webhook called successfully";

    vi.mocked(getProspect).mockImplementation(() =>
      EitherAsync<Error, DbProspect>(() => Promise.resolve(mockProspectData))
    );
    vi.mocked(callProspectWebhook).mockImplementation(() =>
      EitherAsync<Error, string>(() => Promise.resolve(mockWebhookResponse))
    );

    const message = {
      eventType: "MEMBER_PROSPECT",
      prospectId: "12345"
    } as Message;

    const result = await processMessage(message).run();

    expect(result.isRight()).toBe(true);
    expect(result.extract()).toEqual(mockWebhookResponse);
  });

  it("should return an error if prospect is not found", async () => {
    const message = {
      eventType: "MEMBER_PROSPECT",
      prospectId: "not-exist-id"
    } as Message;

    vi.mocked(getProspect).mockReturnValue(
      EitherAsync<Error, DbProspect>(() => Promise.reject(new Error("Prospect not found")))
    );

    const result = await processMessage(message).run();

    expect(result.isLeft()).toBe(true);
    expect(result).toEqual(Left(new Error("Prospect not found")));
  });

  it("should throw an error webhook call fails", async () => {
    const mockProspectData = {
      id: "p111",
      givenName: "John",
      surname: "Doe",
      mobileNumber: "+61456789876",
      postCode: "2900",
      dob: "1990-09-09",
      email: "test_123@test.com",
      gender: "private",
      memberId: "m123",
      locationId: "loc_456",
      membershipId: "ms_789",
      membershipName: "Membership 1",
      state: "ACT",
      createdAt: "2021-01-01T00:00:00Z"
    } as DbProspect;

    const message = {
      eventType: "MEMBER_PROSPECT",
      prospectId: "12345"
    } as Message;

    vi.mocked(getProspect).mockImplementation(() =>
      EitherAsync<Error, DbProspect>(() => Promise.resolve(mockProspectData))
    );
    vi.mocked(callProspectWebhook).mockImplementation(() =>
      EitherAsync<Error, string>(() => Promise.reject(new Error("Webhook failed")))
    );

    const result = await processMessage(message).run();
    expect(result.isLeft()).toBe(true);
    expect(result.leftOrDefault(new Error()).message).toEqual("Webhook failed");
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

    const message = {
      eventType: memberEventType.MEMBER_OVERDUE,
      memberId: "12345"
    } as Message;
    const result = await processMessage(message).run();
    expect(result.isRight()).toBe(true);
    expect(result.extract()).toEqual("Webhook called successfully");
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

    const mockWebhookResponse = "Webhook called successfully";
    vi.mocked(getMember).mockImplementation(() => EitherAsync<Error, DbMember>(() => Promise.resolve(mockMemberData)));
    vi.mocked(getContracts).mockImplementation(() =>
      EitherAsync<Error, DbContract[]>(() => Promise.resolve(mockContracts))
    );
    vi.mocked(callMemberWebhook).mockImplementation(() =>
      EitherAsync<Error, string>(() => Promise.resolve(mockWebhookResponse))
    );

    const message = {
      eventType: memberEventType.MEMBER_OVERDUE,
      memberId: "12345"
    } as Message;
    const result = await processMessage(message).run();
    expect(result.isRight()).toBe(true);
    expect(result.extract()).toEqual("Webhook called successfully");
  });

  it("should return an error if member is not found", async () => {
    const message = {
      eventType: memberEventType.MEMBER_OVERDUE,
      memberId: "not-exist-id"
    } as Message;

    vi.mocked(getMember).mockReturnValue(
      EitherAsync<Error, DbMember>(() => Promise.reject(new Error("Member not found")))
    );

    const result = await processMessage(message).run();
    expect(result.isLeft()).toBe(true);
    expect(result).toEqual(Left(new Error("Member not found")));
  });
});
