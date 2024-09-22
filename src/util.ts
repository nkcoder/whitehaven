import * as changeCase from "change-case";

type PlainObject = { [key: string]: any } | null | undefined | number | string | boolean;

const convertKeysToSnakeCase = (obj: PlainObject): PlainObject => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  } else if (typeof obj === "object" && obj !== null) {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const newKey = changeCase.snakeCase(key);
      return { ...acc, [newKey]: convertKeysToSnakeCase(value) };
    }, {});
  }

  return obj;
};

export { convertKeysToSnakeCase, PlainObject };
