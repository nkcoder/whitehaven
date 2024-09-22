import { describe, it, expect } from "vitest";
import { convertKeysToSnakeCase, PlainObject } from "../src/util";

describe("convertKeysToSnakeCase", () => {
  it("should convert flat object keys to snake_case", () => {
    const input = { firstName: "John", lastName: "Doe" };
    const expected = { first_name: "John", last_name: "Doe" };
    expect(convertKeysToSnakeCase(input)).toEqual(expected);
  });

  it("should handle nested objects", () => {
    const input = { userName: { firstName: "John", lastName: "Doe" } };
    const expected = { user_name: { first_name: "John", last_name: "Doe" } };
    expect(convertKeysToSnakeCase(input)).toEqual(expected);
  });

  it("should handle arrays", () => {
    const input = { allUsers: [{ firstName: "John", lastName: "Doe" }] };
    const expected = { all_users: [{ first_name: "John", last_name: "Doe" }] };
    expect(convertKeysToSnakeCase(input)).toEqual(expected);
  });

  it("should handle empty objects", () => {
    expect(convertKeysToSnakeCase({})).toEqual({});
  });

  it("should return the input if it is not an object", () => {
    expect(convertKeysToSnakeCase(null)).toBeNull();
    expect(convertKeysToSnakeCase(42)).toBe(42);
    expect(convertKeysToSnakeCase("string")).toBe("string");
    expect(convertKeysToSnakeCase(true)).toBe(true);
  });
});
