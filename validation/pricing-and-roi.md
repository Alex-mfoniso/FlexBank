# Pricing validation and customer ROI

## Pricing hypotheses — not final pricing

| Option | Hypothesis | What must be learned |
|---|---|---|
| A: platform fee | Predictable monthly sandbox/orchestration access | Budget owner, acceptable bands, support burden |
| B: platform + usage | Base access plus successful orchestrated-event fee | Metric customers accept, margin, volume volatility |
| C: enterprise minimum | Annual/minimum commitment for SLA, audit, routing and support | Procurement cycle, security requirements, discount pressure |
| D: paid pilot | Fixed fee for a scoped sandbox validation | Whether customers exchange money for learning before production |

Establish current cost and desired outcome before showing price. Ask: “At what price is this an obvious yes?”, “At what price does it require approval?”, “At what price is it too expensive?”, and “What would you choose instead?” Record the exact answer, currency, billing basis, participant authority and evidence kind.

## ROI input rules

Inputs: provider count, engineering hours per integration, engineering hourly cost, monthly reconciliation hours, operations hourly cost, monthly incident frequency, recovery hours, and Ricarut price.

Every money input must be labeled `CUSTOMER_PROVIDED` or `ASSUMED`. Time/frequency inputs also need a source note in the discovery record. Do not call the difference “savings” until a pilot measures it. Do not annualize one exceptional incident without customer confirmation.

Formulas:

- One-time integration cost = providers × hours per integration × engineering hourly cost.
- Monthly reconciliation cost = reconciliation hours × operations hourly cost.
- Monthly incident cost = incident frequency × recovery hours × operations hourly cost.
- Current monthly operating estimate = reconciliation + incident cost.
- Scenario difference = current monthly estimate − proposed Ricarut monthly cost.

The calculator in `src/validation/validation-engine.ts` rejects mixed currencies and marks any scenario containing assumptions.

