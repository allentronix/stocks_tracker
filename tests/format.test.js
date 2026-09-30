import { describe, expect, it } from "vitest";
import { formatCompactMoney, formatMoney, formatSigned } from "../src/utils/format.js";

describe("formatMoney", () => {
  it("uses the stock's own currency symbol", () => {
    expect(formatMoney(329.4, "USD")).toBe("$329.40");
    expect(formatMoney(1066.7, "NGN")).toBe("₦1,066.70");
    expect(formatMoney(12.5, "EUR")).toBe("€12.50");
  });

  it("shows zero when the price is missing", () => {
    expect(formatMoney(null, "NGN")).toBe("₦0.00");
    expect(formatMoney(undefined)).toBe("$0.00");
    expect(formatMoney(Number.NaN, "USD")).toBe("$0.00");
  });

  it("falls back to USD for unknown currency codes", () => {
    expect(formatMoney(5, "not-a-currency")).toBe("$5.00");
    expect(formatMoney(5, "")).toBe("$5.00");
  });
});

describe("formatCompactMoney", () => {
  it("abbreviates large values", () => {
    expect(formatCompactMoney(4.81e12, "USD")).toBe("$4.81T");
    expect(formatCompactMoney(17.69e12, "NGN")).toBe("₦17.69T");
    expect(formatCompactMoney(null, "USD")).toBe("$0.00");
  });
});

describe("formatSigned", () => {
  it("adds a sign and shows missing values as zero", () => {
    expect(formatSigned(1.234)).toBe("+1.23");
    expect(formatSigned(-0.4, "%")).toBe("-0.40%");
    expect(formatSigned(null, "%")).toBe("0.00%");
  });
});
