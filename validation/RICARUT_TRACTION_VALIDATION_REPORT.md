# Ricarut Traction + Validation Report

**Date:** 4 September 2026  
**Decision:** Continue discovery; do not claim traction and do not begin real-money production.

## A. Current ICP

**ASSUMED:** Nigeria-first fintech, payroll, lending, marketplace, or remittance teams already operating or actively adding at least two payout providers and experiencing integration, outage recovery, switching, or reconciliation pain.

## B. Current buyer

**ASSUMED:** User is a backend/platform engineer or payments operator. Buyer may be Head of Engineering, CTO, Head of Payments, or product owner. Economic buyer and budget are unknown.

## C. Current problem

**ASSUMED:** Multi-provider payout teams duplicate adapter work, normalize incompatible statuses/errors, recover ambiguous failures, and manually reconcile provider truth with internal records.

## D. Evidence supporting the problem

None from customers has been recorded. The repository and investor analysis establish technical plausibility, not customer demand.

## E. Evidence against the problem

No customer counter-evidence has been recorded. Known competing explanation: many teams may rationally use one established provider or integrate providers directly.

## F. Current alternatives

**ASSUMED:** one provider, direct integrations, internal adapter layer, spreadsheets/internal reconciliation, established PSP/BaaS platforms. Interview evidence is required.

## G. Strongest customer segment

Unknown. The multi-provider payout segment is a hypothesis only.

## H. Weakest customer segment

**ASSUMED:** early teams with one provider, low volume, no outage/switching trigger, and no dedicated payment operations. Must be tested rather than asserted.

## I. Design partners

**ACTUAL: 0.** A qualification and offer framework now exists.

## J. Pilot results

**ACTUAL: none.** Targets are not results.

## K. Provider integration results

**CURRENT PRODUCT:** one fake provider adapter supporting simulated transfer/status/webhook behavior. **ACTUAL real-provider sandbox integrations: 0.** Provider A and B remain unselected pending workflow evidence and explicit authorization.

## L. Reconciliation findings

No experiment has been executed. A controlled protocol now defines MATCHED, BREAK, PENDING, and RESOLVED cases without modifying financial balances.

## M. Pricing findings

**ACTUAL pricing conversations: 0.** Platform, platform-plus-usage, enterprise minimum, and paid-pilot options are hypotheses. No price is validated.

## N. Customer acquisition findings

None. Initial experiment is founder-led behavior-first outreach to a named list of 50 in-scope companies. No channel has proven conversion or CAC.

## O. Current traction

**ACTUAL:** 0 recorded prospects, interviews, qualified companies, design partners, pilots, paid pilots, or production customers in the evidence system. This does not assert nobody has ever seen the product; it states no qualifying external evidence has been entered.

## P. Current revenue

**ACTUAL recorded revenue: ₦0.**

## Q. Product usage

Repository/demo activity is excluded from traction. **ACTUAL verified external usage recorded: 0.** Instrumentation must distinguish internal, test, seeded, and external activity before reporting usage.

## R. Evidence level

**LEVEL 2 — Working sandbox.** Level 3 requires recorded external developer validation. Levels 4–10 must not be skipped:

0 Idea → 1 Prototype → **2 Working sandbox** → 3 External developer validation → 4 Design partners → 5 Technical pilots → 6 Paid pilots → 7 Production customers → 8 Repeatable revenue → 9 Scalable acquisition → 10 Defensible infrastructure business.

## S. Kill criteria

Precommitted thresholds are in `kill-criteria.md`. The thesis changes or stops on low pain prevalence, preference for direct integration, refusal to commit test time/payment, no second-provider benefit, weak reconciliation demand, provider prohibition, unattractive regulation/economics, unreasonable CAC, or unresolved safety.

## T. What changed because of customer evidence

Nothing. No customer evidence exists. The ICP was narrowed because of investor analysis; representing that as customer learning would be false.

## U. Next three experiments

1. **Pain prevalence:** Complete 20 interviews in the same multi-provider payout segment. Success: at least 20% HIGH/EXTREME with observed behavior or quantified claims. Failure triggers segment/thesis review.
2. **Commitment:** Ask only qualified participants for a named two-week sandbox test with measurable baseline. Success: at least 3 of 20 commit technical time and supply lawful evidence.
3. **Payment path:** With those qualified, test a scoped paid-pilot offer and price bands. Success: at least two identify buyer/budget and accept paid or explicitly conditional paid terms. No provider connection is needed for the first discovery step.

## V. Investor-ready evidence

The validation system, fixed scoring method, qualification gate, zero-state dashboard, experiment protocols, capability matrix, error taxonomy, ROI guardrails, paid-pilot template, weekly review, and kill criteria are ready. Customer evidence is not.

## VI. Remaining unknowns

Actual pain prevalence and severity; strongest company type/size/workflow; provider combinations; trigger event; buyer and budget; willingness to switch/test/pay; acceptable price; sales cycle and CAC; retention; second-provider abstraction benefit; reconciliation value; provider contract permission; production regulatory perimeter; unit economics; support burden; and team capability to sell and operate.

## Conclusion

Ricarut currently deserves disciplined discovery, not a traction narrative. The next work is interviews and commitments. If customers love the measurable outcome, double down. If they like it but will not pay, reposition. If they need it and the adapter fails, rebuild that layer. If they do not care, kill or pivot the thesis.
