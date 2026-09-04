# Sandbox reconciliation experiment

Purpose: test whether Ricarut can detect and explain differences between its simulated ledger and a synthetic provider statement. This is not financial volume or production traction.

## Record shape

| Field | Meaning |
|---|---|
| experimentId | Unique test run |
| reference | Shared synthetic transaction reference |
| provider | Fake or authorized sandbox provider |
| expectedMinor | Ricarut ledger amount |
| actualMinor | provider sandbox statement amount, or null while absent |
| differenceMinor | `actualMinor - expectedMinor` |
| currency | ISO currency code |
| observedAt | Provider observation time |
| status | MATCHED / BREAK / PENDING / RESOLVED |
| resolution | Required only for RESOLVED; retain original break |

## Controlled cases

These are **TEST FIXTURES**, not actual customer or financial records.

| Case | Internal | Provider | Difference | Expected status |
|---|---:|---:|---:|---|
| Exact match | ₦100,000 | ₦100,000 | ₦0 | MATCHED |
| Amount break | ₦100,000 | ₦98,000 | −₦2,000 | BREAK |
| Missing provider record | ₦100,000 | unknown | unknown | PENDING, then BREAK after threshold |
| Provider-only record | absent | ₦100,000 | +₦100,000 | BREAK |
| Duplicate provider record | ₦100,000 | 2 × ₦100,000 | +₦100,000 | BREAK |
| Late match | ₦100,000 | initially absent, later ₦100,000 | ₦0 | PENDING → MATCHED |

## Validation procedure

1. Freeze input fixtures and expected outcomes before running.
2. Import synthetic provider observations without changing ledger balances.
3. Match first on immutable provider reference and provider account context—not amount alone.
4. Record expected, actual, difference, timestamps and status.
5. Resolve through an annotated control action; never overwrite the original break.
6. Measure match rate, false matches, time to detect, time to explain, and manual steps.
7. Have a second reviewer verify breaks and resolutions.

Pilot success is not “the demo worked.” It is a precommitted measurable improvement over the customer’s baseline with no false matches.

