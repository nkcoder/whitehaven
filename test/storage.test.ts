import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClient } from "../src/dynamodbClient";
import { contractSchema, dbContractSchema, dbMemberSchema, dbSuspensionSchema, memberSchema } from "../src/schema";
import { getDataForKeepMe } from "../src/service";
import { getActiveSuspensions, getContracts, getMember } from "../src/database";

vi.mock("../src/dynamodbClient");

describe("storage", () => {
  const originalProcessEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    process.env = { ...originalProcessEnv };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalProcessEnv;
  });

  describe("getMember", () => {
    const mockMember = {
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
    };

    it("should retrieve member", async () => {
      process.env.MEMBER_TABLE = "member";

      const mockGetClient = {
        send: vi.fn().mockImplementation((command: GetCommand) => Promise.resolve({ Item: mockMember }))
      } as unknown as DynamoDBDocumentClient;

      vi.mocked(getClient).mockReturnValue(mockGetClient);

      const result = await getMember("123").run();

      expect(result.isRight()).toBe(true);
      expect(result.extract()).toEqual(dbMemberSchema.parse(mockMember));
    });

    it("should return an error if member is not found", async () => {
      const mockGetClient = {
        send: vi.fn().mockImplementation((command: GetCommand) => {
          if (command instanceof GetCommand) {
            return Promise.resolve({ Item: null });
          }
        })
      } as unknown as DynamoDBDocumentClient;

      vi.mocked(getClient).mockReturnValue(mockGetClient);

      const result = await getMember("123");

      expect(result.isLeft()).toBe(true);
      const errorMessage = result.leftOrDefault(new Error()).message;
      expect(errorMessage).toEqual(
        "Error retrieving member with memberId 123: Error: Member with memberId 123 not found"
      );
    });
  });

  describe("getContracts", () => {
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
        expiryDateTime: "2022-01-01T00:00:00Z",
        status: "active"
      }
    ];

    it("should retrieve contracts", async () => {
      process.env.CONTRACT_TABLE = "contract";

      const mockQueryClient = {
        send: vi.fn().mockImplementation((command: QueryCommand) => Promise.resolve({ Items: mockContracts }))
      } as unknown as DynamoDBDocumentClient;

      vi.mocked(getClient).mockReturnValue(mockQueryClient);

      const result = await getContracts("123").run();

      expect(result.isRight()).toBe(true);
      expect(result.extract()).toEqual(mockContracts.map(contract => dbContractSchema.parse(contract)));
    });

    it("should return empty if contracts are not found", async () => {
      const mockQueryClient = {
        send: vi.fn().mockImplementation((command: QueryCommand) => {
          return Promise.resolve({ Items: [] });
        })
      } as unknown as DynamoDBDocumentClient;

      vi.mocked(getClient).mockReturnValue(mockQueryClient);

      const result = await getContracts("123");

      expect(result.isRight()).toBe(true);
      expect(result.extract()).toEqual([]);
    });

    it("should return an error if there is an error retrieving contracts", async () => {
      const mockQueryClient = {
        send: vi.fn().mockImplementation((command: QueryCommand) => {
          throw new Error("Error retrieving contracts");
        })
      } as unknown as DynamoDBDocumentClient;

      vi.mocked(getClient).mockReturnValue(mockQueryClient);

      const result = await getContracts("123");

      expect(result.isLeft()).toBe(true);
      const errorMessage = result.leftOrDefault(new Error()).message;
      expect(errorMessage).toEqual("Error retrieving contracts for memberId 123: Error: Error retrieving contracts");
    });
  });

  describe("getActiveSuspensions", () => {
    const mockSuspensions = [
      {
        id: "s111",
        memberContractId: "id111",
        memberId: "123",
        suspensionStartDateTime: "2021-01-01T00:00:00Z",
        suspensionEndDateTime: "2021-02-01T00:00:00Z",
        cancelledDateTime: null
      }
    ];

    it("should retrieve active suspensions", async () => {
      process.env.SUSPENSION_TABLE = "suspension";

      const mockQueryClient = {
        send: vi.fn().mockImplementation((command: QueryCommand) => Promise.resolve({ Items: mockSuspensions }))
      } as unknown as DynamoDBDocumentClient;

      vi.mocked(getClient).mockReturnValue(mockQueryClient);

      const result = await getActiveSuspensions("id111").run();

      expect(result.isRight()).toBe(true);
      expect(result.extract()).toEqual(mockSuspensions.map(suspension => dbSuspensionSchema.parse(suspension)));
    });

    it("should return empty if active suspensions are not found", async () => {
      const mockQueryClient = {
        send: vi.fn().mockImplementation((command: QueryCommand) => {
          return Promise.resolve({ Items: [] });
        })
      } as unknown as DynamoDBDocumentClient;

      vi.mocked(getClient).mockReturnValue(mockQueryClient);

      const result = await getActiveSuspensions("id111");

      expect(result.isRight()).toBe(true);
      expect(result.extract()).toEqual([]);
    });

    it("should return an error if there is an error retrieving active suspensions", async () => {
      const mockQueryClient = {
        send: vi.fn().mockImplementation((command: QueryCommand) => {
          throw new Error("Error retrieving active suspensions");
        })
      } as unknown as DynamoDBDocumentClient;

      vi.mocked(getClient).mockReturnValue(mockQueryClient);

      const result = await getActiveSuspensions("id111");

      expect(result.isLeft()).toBe(true);
      const errorMessage = result.leftOrDefault(new Error()).message;
      expect(errorMessage).toEqual(
        "Error retrieving active suspensions for contractId id111: Error: Error retrieving active suspensions"
      );
    });
  });
});
