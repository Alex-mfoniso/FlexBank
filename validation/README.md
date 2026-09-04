# Ricarut Validation System

This workspace collects evidence for deciding whether Ricarut deserves to become a company. It is not a CRM, a production financial system, or a source of marketing claims.

## Current hypothesis

| Field | Hypothesis — not evidence |
|---|---|
| ICP | Nigeria-first fintech, payroll, lending, marketplace, or remittance engineering teams that already operate, or are actively adding, at least two payout providers. |
| User | Backend/platform engineer or payments-operations specialist. |
| Buyer | Head of Engineering, CTO, Head of Payments, or product owner responsible for payout reliability. |
| Economic buyer | Executive owning engineering or payment-operations budget; to be discovered. |
| Trigger | Second-provider integration, provider outage, market expansion, failed reconciliation, or procurement-driven provider change. |
| Alternative | Use one provider, integrate each provider directly, or build an internal adapter/reconciliation layer. |
| Pain | Repeated integration work, incompatible failure states, manual reconciliation, and slow provider switching. |
| Desired outcome | Add or switch a payout provider with less engineering work while preserving reliable, auditable internal state. |

This hypothesis must change or die when evidence contradicts it.

## Files

- `data/discovery-records.json` — canonical prospect/interview records. It intentionally starts empty.
- `data/traction-metrics.json` — separately names ACTUAL, TARGET, and ASSUMED metrics.
- `discovery-record.schema.json` — validation contract for every record.
- `interview-guide.md` — behavior-first interview protocol.
- `design-partner-program.md` — qualification gate and non-production offer.
- `paid-pilot-template.md` — fillable sandbox-only pilot agreement brief.
- `weekly-report-template.md` — repeatable weekly evidence review.
- `reconciliation-experiment.md` — controlled test protocol; examples are not traction.
- `pricing-and-roi.md` — pricing interview and labeled ROI method.
- `provider-capability-matrix.json` — machine-readable current capability evidence.
- `canonical-error-taxonomy.json` — draft neutral error contract.
- `kill-criteria.md` — precommitted stop/change rules.
- `investor-evidence-pack.md` — current zero-state evidence package.
- `RICARUT_TRACTION_VALIDATION_REPORT.md` — Phase 7.8H conclusion.

## Operating rules

1. Create one record per company/contact discovery thread. Do not enter invented or scraped personal data without a legitimate basis.
2. Record answers as given. Mark each statement `DIRECT_QUOTE`, `OBSERVED_BEHAVIOR`, `CLAIM`, or `ASSUMPTION`.
3. A quote requires explicit text and permission status. Never publish it unless permission is `PUBLIC`.
4. Score all six pain dimensions from 1–5 using the anchors in the interview guide. Never reverse-engineer a score to qualify someone.
5. `CONTACTED` is activity, not traction. Only use `DESIGN_PARTNER` after every qualification condition is evidenced. `PAID` requires received, non-refunded consideration or a signed definition explicitly approved by finance.
6. Exclude founders, employees, automated tests, seed records and internal sandbox activity from external product-usage metrics.
7. Preserve losses, objections, failed hypotheses, and missing answers. Empty means unknown—not zero—unless the metric truly is zero.
8. Review records weekly and record every manual correction in version control. Restrict access before storing personal or commercially sensitive details.

## Minimum evidence milestones

- 20 behavior-first interviews in a consistent ICP.
- Five quantified current workflows.
- Three qualified design partners.
- Two conditional or paid pilot commitments.
- One real provider sandbox integration for the chosen workflow, then a behaviorally different second provider.
- Measured baseline and post-pilot outcomes.

Provider integrations remain disabled until separately authorized. No real money may be processed.

