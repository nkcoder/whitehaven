import { SQSClient } from "@aws-sdk/client-sqs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Create a unique marker for each SQSClient instance
const mockSqsClient = {
  send: vi.fn(),
  config: {}
};

// Mock once at the module level with a simple implementation
vi.mock("@aws-sdk/client-sqs", () => ({
  SQSClient: vi.fn().mockImplementation(() => mockSqsClient)
}));

describe("sqsClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should create a new SQSClient with region from environment variable", async () => {
    process.env.AWS_REGION = "us-west-2";

    const { getClient } = await import("../src/sqsClient");
    getClient();

    expect(SQSClient).toHaveBeenCalledWith({ region: "us-west-2" });
  });

  it("should create a new SQSClient with default region when not in environment", async () => {
    delete process.env.AWS_REGION;

    const { getClient } = await import("../src/sqsClient");
    getClient();

    expect(SQSClient).toHaveBeenCalledWith({ region: "ap-southeast-2" });
  });
});
