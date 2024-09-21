import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getClient } from "../src/dynamodbClient";

describe("getClient", () => {
  let originalRegion: string | undefined;

  beforeEach(() => {
    originalRegion = process.env.AWS_REGION;
  });

  afterEach(() => {
    process.env.AWS_REGION = originalRegion;
  });

  it("should return a DynamoDBDocumentClient instance", () => {
    const client = getClient();
    expect(client).toBeInstanceOf(DynamoDBDocumentClient);
  });

  it("should create a DynamoDBClient with the specified region", async () => {
    const region = "us-west-2";
    process.env.AWS_REGION = region;

    const client = getClient();
    const configRegion = await client.config.region();
    expect(configRegion).toBe(region);
  });

  it("should create a DynamoDBClient with the default region if AWS_REGION is not set", async () => {
    delete process.env.AWS_REGION;

    const client = getClient();
    const configRegion = await client.config.region();
    expect(configRegion).toBe("ap-southeast-2");
  });
});
