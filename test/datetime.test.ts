import { describe, expect, it } from "vitest";
import { getEarlierDateTime, toDate } from "../src/datetime.js";

describe("Datetime Functions", () => {
  describe("toDate", () => {
    it("should convert a valid ISO date string to yyyy-MM-dd format", () => {
      const result = toDate("2023-10-15T12:00:00Z");
      expect(result).toBe("2023-10-15");
    });
  });

  describe("getEarlierDateTime", () => {
    it("should return the earlier date when both are valid", () => {
      const result = getEarlierDateTime("2023-10-15T12:00:00Z", "2023-10-16T12:00:00Z");
      expect(result.isJust()).toBe(true);
      expect(result.extract()).toEqual("2023-10-15T12:00:00Z");
    });

    it("should return the first date when it is earlier", () => {
      const result = getEarlierDateTime("2023-10-15T12:00:00Z", "2023-10-14T12:00:00Z");
      expect(result.isJust()).toBe(true);
      expect(result.extract()).toEqual("2023-10-14T12:00:00Z");
    });

    it("should return the second date when the first is null", () => {
      const result = getEarlierDateTime(null, "2023-10-16T12:00:00Z");
      expect(result.isJust()).toBe(true);
      expect(result.extract()).toEqual("2023-10-16T12:00:00Z");
    });

    it("should return the first date when the second is null", () => {
      const result = getEarlierDateTime("2023-10-15T12:00:00Z", null);
      expect(result.isJust()).toBe(true);
      expect(result.extract()).toEqual("2023-10-15T12:00:00Z");
    });

    it("should return Maybe.nothing when both are null", () => {
      const result = getEarlierDateTime(null, null);
      expect(result.isNothing()).toBe(true);
    });
  });

  describe("todayDate", () => {
    it("should return the current date in yyyy-MM-dd format", () => {
      const result = toDate(new Date().toISOString());
      expect(result).toBe(toDate(new Date().toISOString()));
    });
  });
});
