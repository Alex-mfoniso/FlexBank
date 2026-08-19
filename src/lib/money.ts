import { CurrencyMismatchError, InvalidAmountError } from "./errors";

/**
 * Deterministic integer-based money math utility.
 * Enforces operations on minor currency units (e.g. kobo or cents) and checks currency consistency.
 */
export class Money {
  /**
   * Validates that an amount is a positive, non-zero integer.
   */
  static validate(amount: number): void {
    if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
      throw new InvalidAmountError("Amount must be a positive integer in minor units");
    }
  }

  /**
   * Safe integer addition.
   */
  static add(a: number, b: number): number {
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      throw new InvalidAmountError("Add operands must be integers");
    }
    return a + b;
  }

  /**
   * Safe integer subtraction.
   */
  static subtract(a: number, b: number): number {
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      throw new InvalidAmountError("Subtract operands must be integers");
    }
    return a - b;
  }

  /**
   * Standard integer comparison.
   * Returns -1 if a < b, 1 if a > b, and 0 if a === b.
   */
  static compare(a: number, b: number): number {
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      throw new InvalidAmountError("Comparison operands must be integers");
    }
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  /**
   * Asserts that two ISO currency codes are identical.
   */
  static assertSameCurrency(curA: string, curB: string): void {
    if (!curA || !curB || curA.toUpperCase() !== curB.toUpperCase()) {
      throw new CurrencyMismatchError(`Currency mismatch: ${curA.toUpperCase()} does not match ${curB.toUpperCase()}`);
    }
  }
}
