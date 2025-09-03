import * as changeCase from "change-case";

type JsonValue = string | number | boolean | null | undefined | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
type PlainObject = JsonValue;

const convertKeysToSnakeCase = (obj: PlainObject): PlainObject => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }

  return Object.entries(obj).reduce((acc, [key, value]) => {
    const newKey = changeCase.snakeCase(key);
    return { ...acc, [newKey]: convertKeysToSnakeCase(value) };
  }, {});
};

const getQueueUrlByArn = (queueArn: string): string => {
  const [, , , region, accountId, queueName] = queueArn.split(":");
  return `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
};

export { convertKeysToSnakeCase, getQueueUrlByArn, type PlainObject };
