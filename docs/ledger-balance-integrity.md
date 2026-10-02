# Ricarut — Ledger & Balance Integrity Architecture (Phase 8)

## 1. Distinction: Sandbox Simulated Balance vs. Real Provider Funds

In Ricarut, account balances exist across two strictly isolated domains:

| Domain | Mechanism | Upstream Backing | Mutation Policy |
| :--- | :--- | :--- | :--- |
| **Sandbox / Internal Ledger** | Double-entry journal entries (`JournalEntry`, `Account`) | Local simulated ledger balance in minor units | Immutable double-entry ledgering. Strict debit/credit equality. Zero direct balance manipulation. |
| **Production / Provider Real Funds** | Upstream Paystack / Safaricom M-Pesa clearing accounts | Commercial banking liquidity in Nigeria & Kenya | Settled by provider banks/telcos. In Ricarut, these are tracked through `Transfer` and `ProviderTransaction` audit states. |

---

## 2. Ledger Invariants

1. **Double-Entry Enforcement**:
   Every balance movement in the internal ledger must balance:
   $$\sum \text{debits} - \sum \text{credits} = 0$$
   Direct SQL updates (`UPDATE accounts SET balance = ...`) are strictly prohibited in application logic.
2. **Integer Minor Units**:
   All monetary amounts are represented as 64-bit integers in minor units (e.g. `10000` = 100.00 NGN or KES). Floating-point arithmetic is never used for currency.
3. **No Admin Force-Success Shortcuts**:
   There are no administrative bypasses to force a `pending` transfer to `successful` without an authentic provider webhook verification or authenticated reconciliation query.
4. **Sandbox Simulated Funding**:
   Sandbox account funding (`/v1/test/fund`) is strictly gated by `NODE_ENV !== "production"` and requires an active test API key.
