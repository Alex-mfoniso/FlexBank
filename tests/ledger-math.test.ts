import { describe, it, expect } from "vitest";
import { Money } from "../src/lib/money";
import { InvalidAmountError, CurrencyMismatchError } from "../src/lib/errors";

describe("Ledger Precision Money Math", () => {
  it("should validate integer minor currency units and reject fractional/negative values", () => {
    expect(() => Money.validate(1000000)).not.toThrow();
    expect(() => Money.validate(100.5)).toThrow(InvalidAmountError);
    expect(() => Money.validate(0)).toThrow(InvalidAmountError);
    expect(() => Money.validate(-50)).toThrow(InvalidAmountError);
  });

  it("should execute addition and subtraction safely on integer limits", () => {
    expect(Money.add(100, 200)).toBe(300);
    expect(Money.subtract(500, 200)).toBe(300);
    expect(() => Money.add(1.5, 2)).toThrow(InvalidAmountError);
  });

  it("should compare integer amounts with expected sign results", () => {
    expect(Money.compare(1000, 2000)).toBe(-1);
    expect(Money.compare(3000, 2000)).toBe(1);
    expect(Money.compare(2000, 2000)).toBe(0);
  });

  it("should validate currency identities case-insensitively and reject mismatches", () => {
    expect(() => Money.assertSameCurrency("NGN", "ngn")).not.toThrow();
    expect(() => Money.assertSameCurrency("NGN", "USD")).toThrow(CurrencyMismatchError);
  });
});
