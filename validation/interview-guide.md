# Behavior-first interview guide

## Protocol

Ask for a specific recent event, not opinions about a hypothetical product. Do not show Ricarut until the current workflow, cost, frequency, owner, and consequence are understood. Ask permission before recording. Never turn silence into “no” or enthusiasm into willingness to pay.

Opening: “I’m researching how teams operate financial-provider integrations. This is not a sales call. I want to understand what you do today, including cases where the current approach works well.”

## Questions

1. Walk me through how you currently handle payments, transfers, or accounts.
2. Which providers do you use today? Which workflow goes to each?
3. Why did you choose them?
4. How many providers are integrated in production, in testing, and planned?
5. Tell me about the most recent provider outage or degraded event.
6. What happened to customers and internal operations?
7. How long did detection and recovery take? What records show that?
8. Tell me about the last time you needed or considered switching providers.
9. What made the switch difficult or easy?
10. How many people and engineering hours were involved?
11. Show or describe the current reconciliation workflow.
12. Who owns it and who gets paged when it breaks?
13. How often are there unmatched or ambiguous transactions?
14. What happens when provider data differs from internal records?
15. Which step is most painful, and why?
16. What have you built or bought to improve it?
17. What still fails about that approach?
18. What event would cause you to change the current approach?
19. Who approves infrastructure purchases of this kind?
20. Which budget pays, and what alternatives compete for it?
21. After the problem discussion: would you spend engineering time testing a sandbox approach? What would the test need to prove?
22. If that test met its criteria, would you consider paying? Who decides?
23. What measurable result makes it worth paying for?
24. At what price is it an obvious yes?
25. At what price does it require approval?
26. At what price is it too expensive?
27. What would you choose instead?

## Pain-score anchors

Score only after the interview. Cite evidence for each dimension.

| Score | Frequency | Financial impact | Engineering effort | Operational effort | Urgency | Workaround weakness |
|---:|---|---|---|---|---|---|
| 1 | Never/one-off | No material impact | <1 engineer-day | Negligible | No deadline | Works well |
| 2 | Annual | Small/absorbed | 1–5 engineer-days | Occasional manual work | Someday | Minor gaps |
| 3 | Quarterly | Noticeable, unquantified | 1–3 engineer-weeks | Monthly burden | Within 6 months | Tolerable but painful |
| 4 | Monthly | Quantified material loss/cost | 1–2 engineer-months | Weekly burden/on-call | Within 90 days | Regularly fails |
| 5 | Weekly/daily | Severe or existential | >2 engineer-months | Continuous team burden | Active purchase/incident | Unsafe or unusable |

Total bands are fixed: 6–10 LOW, 11–18 MEDIUM, 19–24 HIGH, 25–30 EXTREME. The original brief says 0–10, but six dimensions scored 1–5 make 6 the mathematical minimum.

## Evidence classification

- **OBSERVED_BEHAVIOR:** artifact or demonstrated action, such as an incident timeline, engineering ticket, invoice, reconciliation sheet, or screen-shared workflow.
- **DIRECT_QUOTE:** exact words with permission status.
- **CLAIM:** participant statement not independently demonstrated.
- **ASSUMPTION:** interviewer interpretation or unknown filled for modeling; never counts as problem proof.

Close by summarizing what you heard and asking the participant to correct it. Record contradictions and evidence against Ricarut.

