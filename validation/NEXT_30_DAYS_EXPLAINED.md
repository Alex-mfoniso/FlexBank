# Ricarut: Next 30 Days Explained

## The main objective

Ricarut's next priority is not another dashboard page. It is proving that real companies experience the problem Ricarut targets and will commit time or money to solving it.

The current product proves that a sandbox can be built. It does not yet prove that Ricarut should become a company. During the next 30 days, technical work should make the sandbox trustworthy enough to test, while customer work should determine whether the business thesis is true.

The sequence is:

```text
Fix critical bugs
    ↓
Interview target companies
    ↓
Secure design partners
    ↓
Sell narrow paid pilots
    ↓
Test real provider sandboxes
    ↓
Prepare for regulated production only if the evidence supports it
```

This sequence prevents Ricarut from spending months building integrations or features that customers may not need.

---

## 1. Fix the critical technical risks

### Why this comes first

Design partners will trust Ricarut with synthetic versions of important financial workflows. Even though no real money is involved, obvious accounting, concurrency, and tenant-isolation failures would make the pilot results unreliable and damage confidence.

These fixes make the product suitable for controlled sandbox pilots. They do not make it production-ready.

### Block cross-project account transfers

A project is one customer's isolated workspace. An API key belonging to Project A should not be able to modify an account belonging to Project B.

The current internal-transfer flow verifies that the source account belongs to the calling project, but it looks up the destination using only the account ID. If somebody obtains another project's destination account ID, the code may transfer simulated value to it.

The immediate solution is to require both the account ID and current project ID when looking up the destination. A future cross-project payment feature would need an explicit public addressing and authorization design; it should not happen accidentally through internal database IDs.

**Done means:**

- A Project A key cannot use a Project B account as source or destination.
- The API returns a safe not-found or forbidden response.
- A regression test proves the boundary remains enforced.

### Prevent duplicate settlement under concurrency

Concurrency means two processes can handle the same event at nearly the same time. For example, a provider webhook and a scheduled status check may both report that one transfer succeeded.

Both processes could read `processing`, post settlement entries, and subtract the pending balance before either sees the other's update. That would settle one transfer twice.

The fix requires an atomic state transition. The database must allow only one process to change the transfer from an eligible non-terminal state to a settling or successful state. This can use a row lock or a conditional update that succeeds only when the existing status matches the expected status. Settlement journals should also have deterministic unique references as a second defense.

**Done means:**

- Ten or more simultaneous settlement attempts create exactly one settlement journal.
- Pending balance is reduced exactly once.
- Every other attempt returns the already-resolved transfer without posting entries.
- A real PostgreSQL concurrency test proves it.

### Make system ledger accounts project-specific

Ricarut creates internal system ledgers such as a transit holding account. Their current IDs are based on a value such as currency, for example `transit_holding_NGN`.

Database IDs are globally unique. If two projects try to create `transit_holding_NGN`, the second project may collide with the first. It can also create confusion about which project owns the ledger.

Use a generated ID plus a unique combination of project, purpose, and currency, or include the project ID in the deterministic identifier.

**Done means:**

- Two projects can independently create NGN transit accounts.
- Each system account belongs to exactly one project.
- Database constraints prevent duplicates inside the same project.
- A two-project test proves the behavior.

### Fix unsafe webhook-to-transfer matching

A provider webhook informs Ricarut that a transfer changed status. Ricarut must connect that event to exactly one correct transfer.

The current fallback can search using a customer reference that is unique only inside a project. Two projects can use the same reference. Without a provider account or project context, the wrong transfer might be selected.

The preferred match is an immutable provider transaction mapping containing the provider, provider account/environment, and provider reference. A customer reference should be used only when the provider context identifies the correct project and the uniqueness rule supports it.

**Done means:**

- A webhook can resolve only a transfer created through that provider context.
- Duplicate customer references across projects cannot cause cross-project mutation.
- Unknown and ambiguous events are quarantined for investigation rather than guessed.
- Tests cover duplicate, unknown, malformed, and replayed events.

### Add regression tests

A regression test reproduces a specific bug and proves it cannot return unnoticed later. Each critical finding needs at least one failure test and one valid-path test.

Tests should cover:

- Cross-project source and destination rejection.
- Concurrent settlement and reversal.
- Two projects using the same currency-specific system-ledger purpose.
- Webhooks with duplicate references, wrong providers, replays, and unknown transfers.

### Make all quality checks pass

The TypeScript build currently passes, but the full test run still needs a clean execution environment and the complete lint command has existing failures and warnings.

Passing checks do not prove the product is secure. They provide repeatable evidence that known expectations hold.

**Technical exit condition:** type-check, build, lint, unit tests, integration tests, and real-PostgreSQL concurrency tests all pass in CI with saved results.

---

## 2. Interview 20 target companies

### Why interviews matter

Ricarut currently has a plausible problem hypothesis, not customer evidence. Interviews reveal what companies already do, what breaks, how often it breaks, and whether the consequences justify purchasing another infrastructure dependency.

The interview is not primarily a product demonstration. Showing Ricarut too early encourages polite feedback and leads the participant toward the answer the founder wants.

### Who to interview

Start in Nigeria with companies that already operate or are actively adding more than one payout provider:

- **Marketplaces:** pay many sellers, drivers, vendors, or service providers.
- **Payroll platforms:** send scheduled payments to many bank accounts and care about completion and reconciliation.
- **Lenders:** disburse loans and must accurately connect each payout to an internal loan record.
- **Remittance products:** move money across systems or countries and encounter provider and settlement differences.
- **Fintech payment-operations teams:** monitor failures, investigate mismatches, and manage provider incidents.

Avoid treating all developers or startups as one market. A small company using one provider without problems may have no reason to buy Ricarut.

### Who to speak with

- **Backend/platform engineer:** understands implementation details.
- **Payments operations lead:** understands failure and reconciliation work.
- **Head of Engineering or CTO:** understands engineering priorities and risk.
- **Product or payments owner:** understands the business outcome.
- **Economic buyer:** can approve spending. This may be one of the above or a finance/executive leader.

One person may not know every answer. A strong company interview may require both a technical user and a budget owner.

### What evidence to collect

#### Providers currently used

Record production, sandbox, abandoned, and planned providers separately. Ask which exact workflow each provider handles. “We use Paystack” is incomplete if it does not explain whether that means collections, payouts, accounts, or verification.

#### Time required to add a provider

Ask about the most recent completed integration. Record people, elapsed time, engineering hours, delays, testing, certification, and maintenance. A ticket history or project plan is stronger than memory.

#### Outages and recovery

Ask for the most recent specific incident: how it was detected, affected transactions, customer impact, investigation time, recovery steps, and follow-up work. Do not assume every provider outage caused material damage.

#### Reconciliation workload

Reconciliation compares internal records with provider or bank records to identify missing, duplicated, delayed, or mismatched transactions. Record how often it occurs, who owns it, tools used, manual steps, unresolved breaks, and time spent.

#### Engineering and operational cost

Separate engineering build/maintenance from ongoing operational investigation. Customer-provided salary or hourly figures must be labeled `CUSTOMER_PROVIDED`. Your own estimates must be labeled `ASSUMED`.

#### Current workaround

The true competitor may be a spreadsheet, internal script, manual status lookup, one preferred provider, or an internal adapter library. Learn why the workaround is acceptable and where it fails.

#### Buying authority and budget

Identify who can approve a pilot, which budget pays, the procurement/security steps, and which alternative projects compete for the money. A user who loves the product but cannot access a buyer is weak commercial evidence.

### How to score pain

Use the same six 1–5 dimensions for every completed interview:

- Frequency
- Financial impact
- Engineering effort
- Operational effort
- Urgency
- Weakness of the existing workaround

The maximum is 30. Scores of 19–24 are HIGH and 25–30 are EXTREME. Every score needs a reason and evidence reference. Never increase a score simply because the company seems attractive.

Use [interview-guide.md](interview-guide.md) for the complete questions and scoring anchors. Store structured results in [discovery-records.json](data/discovery-records.json).

**Interview exit condition:** 20 completed behavior-first interviews in a consistent segment, including evidence that supports and contradicts the thesis.

---

## 3. Qualify three design partners

### What a design partner is

A design partner is a real company working closely with Ricarut to test and shape one defined workflow. It is more serious than a prospect, signup, beta user, friend, or person who says the project looks useful.

The company does not need to process money through Ricarut. It commits a named person, a current problem, technical time, feedback, and a decision path if the test succeeds.

### Qualification requirements

All five conditions must be true:

1. **The problem exists today.** The company is not discussing a vague future possibility.
2. **It has measurable cost.** Evidence may be engineering hours, manual steps, incidents, delayed transactions, support tickets, or financial impact.
3. **The company commits engineering time.** A named participant agrees to dates and tasks.
4. **It will provide technical feedback.** The team will share lawful requirements, failure cases, usability feedback, and measurements.
5. **There is a realistic path to payment.** A buyer and decision process exist if success criteria are reached.

If any item is missing, keep the company at `INTERVIEWED` or `QUALIFIED`; do not inflate it to `DESIGN_PARTNER`.

### The two-week offer

Ricarut can offer to model one existing payout workflow in the sandbox, reproduce agreed failure cases, and measure whether a provider-neutral contract could reduce integration or reconciliation work.

The design partner receives:

- Early sandbox access.
- Direct founder support.
- Structured technical review.
- Failure simulation.
- Written findings.

Ricarut receives:

- Real workflow requirements.
- Current failure cases.
- Baseline measurements.
- Product and pricing objections.
- Permission to measure agreed outcomes.

Do not promise real money, regulatory coverage, provider availability, or production uptime.

### Example

A payroll company currently uses Provider A for payouts and manually prepares Provider B as backup. It shows that the last provider change used two engineers for four weeks. Its engineering lead commits ten hours to a Ricarut sandbox test, while its CTO agrees to review a paid pilot if Ricarut demonstrates a faster second integration. This can qualify as a design partner.

A friend who creates an account and says “nice API” does not.

Use [design-partner-program.md](design-partner-program.md) for the formal offer.

**Design-partner exit condition:** three independent qualified companies with named participants, workflows, test dates, evidence, and payment paths.

---

## 4. Sell two paid pilots

### What a paid pilot is

A paid pilot is a time-limited, narrowly scoped commercial experiment. The company pays Ricarut to test a measurable sandbox outcome. It is not a production customer and does not authorize real-money services.

Payment is valuable evidence because the customer sacrifices both money and employee time. A verbal promise, free trial, letter saying “interested,” demo attendance, or invoice that is never paid is not the same evidence.

### What Ricarut can sell before production

Ricarut can sell a technical validation service around the sandbox:

> Ricarut will model one multi-provider payout workflow, reproduce agreed provider-failure cases, and measure whether a unified adapter reduces integration and reconciliation work.

The pilot can use Ricarut's fake provider and synthetic provider fixtures initially. An official provider sandbox can be included only after authorization and selection. No real funds are required.

### Required pilot terms

- Company and decision-maker.
- One workflow.
- Fixed start and end dates, commonly two to six weeks.
- Agreed price and payment status.
- Customer-provided baseline.
- Measurable success and failure criteria.
- Named responsibilities on both sides.
- Support limits.
- Test-data handling and deletion.
- Explicit sandbox and non-production limitations.
- Termination and refund treatment.
- Separate permission for quotes, name, logo, or case study.
- Final continue/stop decision date.

### Pilot measurements

Useful metrics include total implementation hours, time to add the second adapter, manual reconciliation steps, time to detect a mismatch, time to recover a simulated failure, and whether the buyer will pay again.

Developer satisfaction is useful but weaker than observed time and payment. “The API feels clean” is not enough.

### Pricing

Do not choose a price only from imagination. First establish the customer's present cost and desired outcome. Then ask for the obvious-yes, approval-required, and too-expensive price levels. Record who answered and whether they control the budget.

Use [paid-pilot-template.md](paid-pilot-template.md) and [pricing-and-roi.md](pricing-and-roi.md).

**Paid-pilot exit condition:** two independent companies exchange real consideration for defined sandbox pilots, or sign explicitly conditional paid commitments with named approval conditions. Report these two evidence types separately.

---

## 5. Select one provider and one workflow

### Why Ricarut should wait for interviews

Integrating a provider is expensive and can create false momentum. The company could spend months integrating collections while customers reveal that payout reconciliation is the real problem.

Interview evidence should determine the first workflow and provider. Payouts are the starting hypothesis, not a predetermined conclusion.

### What a workflow means

A workflow is a narrow customer job, such as:

- Send a bank payout.
- Create a transfer beneficiary.
- Receive transfer status updates.
- Reconcile payout status and amount.
- Switch an unsuccessful payout to manual review.

“Payments” is too broad. One precise workflow makes provider comparison and success measurement possible.

### Choosing Provider A

Choose the provider most relevant to qualified design partners, considering:

- How many use it for the chosen workflow.
- Whether it has an official test environment.
- Whether its contract permits the planned integration.
- Whether Ricarut can obtain proper credentials and documentation.
- Whether the test will reveal important operational behavior.

Obtain permission where required and use official sandbox/test credentials. Keep live mode disabled.

### What to learn from Provider A

- **Authentication:** how credentials are issued, scoped, rotated, and sent.
- **Request structure:** required amount, currency, reference, beneficiary, and metadata fields.
- **Idempotency:** whether repeating the same request safely returns the original result.
- **Statuses:** pending, processing, successful, failed, reversed, or provider-specific variations.
- **Webhooks:** signing, retry behavior, ordering, duplicates, and event identifiers.
- **Errors:** validation, beneficiary, balance, permission, provider, and unknown failures.
- **Timeouts:** whether the provider may accept a request even when Ricarut receives no response.
- **Reconciliation:** which API, export, or statement establishes provider truth.
- **Limits and fees:** test constraints and published/commercial rules, clearly sourced.

### Choosing Provider B

After Provider A works, select a second provider for the same workflow. It should be behaviorally different enough to challenge the abstraction—for example, different authentication, beneficiary model, status lifecycle, webhook signature, idempotency behavior, or reconciliation export.

Do not select Provider B merely because its API looks similar and easy. The purpose is to discover where Ricarut's “one contract” fails.

### What Ricarut must absorb

The customer should send one stable Ricarut request. Ricarut's adapter translates it into each provider's fields and maps provider results into a canonical status and error model without hiding important diagnostic information.

For example, both providers may become Ricarut's `PROCESSING`, but Ricarut must preserve the original provider code, redacted message, request ID, and safe recovery state internally.

### Measuring whether abstraction works

Compare customer-side effort for Provider B through Ricarut against the effort of integrating Provider B directly.

Measure:

- Customer code changed.
- Engineering hours.
- New operational steps.
- Error/status branches.
- Webhook implementation work.
- Reconciliation work.
- Failure-recovery time.

The precommitted kill criterion says the abstraction should reduce implementation effort or operational steps by at least 30% in the controlled experiment. A stronger pilot hypothesis can target 50%, but it must not be claimed before measurement.

If the improvement is insignificant, redesign the abstraction or abandon “integrate once” as the wedge.

**Provider-validation exit condition:** one authorized real provider sandbox works for one evidence-selected workflow, then a behaviorally different second sandbox demonstrates measurable customer-side benefit. This is technical evidence, not customer traction by itself.

---

## 6. Establish the legal path

### Why “software-only” is not enough

A company's regulatory obligations depend on what it actually does: who contracts with the user, receives payment instructions, handles customer data, chooses a provider, holds funds, manages disputes, or is responsible when something fails.

Calling Ricarut a software company does not automatically remove licensing, compliance, outsourcing, privacy, or consumer-protection obligations.

### Diagram the flows

Create four diagrams:

1. **Funds flow:** which legally named account holds money at every step.
2. **Instruction flow:** who authorizes the payment and who sends instructions to the licensed provider.
3. **Data flow:** what personal and transaction data moves between customer, Ricarut, provider, bank, and infrastructure vendors.
4. **Settlement/reconciliation flow:** what record is authoritative and how mismatches are repaired.

Each arrow should name the entity, contract, data/message, responsibility, and failure owner.

### Obtain a written legal opinion

Use Nigerian fintech counsel familiar with CBN payment categories and technology-provider arrangements. Give counsel the actual diagrams and proposed contracts, not only a pitch deck.

Ask which activities require Ricarut's own authorization, which can be performed under a licensed partner arrangement, which approvals are product-specific, and what obligations remain with Ricarut.

### Assign responsibilities

Create a RACI—Responsible, Accountable, Consulted, Informed—for:

- KYC and identity verification.
- AML/CFT and sanctions controls.
- Fraud monitoring and financial loss.
- Customer complaints, reversals, and disputes.
- Transaction limits and approvals.
- Settlement and reconciliation.
- Data protection, retention, and breach response.
- Security incidents and regulator notifications.

A provider saying “we handle compliance” is not enough. The signed contract and applicable rules must define the boundary.

### Confirm provider permission

Provider terms may restrict aggregation, reselling, routing, credential use, data storage, sub-merchants, or presenting the provider's service through another API. Ricarut needs confirmation that its exact model is permitted.

**Legal exit condition before production:** a written legal perimeter, named licensed counterparties, signed provider permission, responsibility RACI, approved flows, and resolved compliance/security requirements. Until then, sandbox only.

---

## The decision milestone after 20 interviews

Ricarut should continue the current thesis only if the evidence contains all of the following.

### At least four HIGH or EXTREME pain scores

Four of 20 equals the minimum 20% pain-prevalence threshold. Each score must be supported by current behavior, quantified claims, or artifacts—not general enthusiasm.

This is a minimum signal, not proof of a large market.

### At least three committed design partners

Three companies must satisfy every qualification condition and commit named people and dates. This proves some prospects will spend scarce engineering time.

### At least two credible payment paths

A credible path identifies the economic buyer, budget, approval process, acceptable value condition, and decision date. A paid pilot is stronger. “We might pay later” is not credible.

### A repeated, narrow workflow problem

The same problem should appear across multiple qualified companies. For example: reconciling ambiguous bank payouts across two providers. Twenty unrelated feature requests do not produce a focused business.

### Evidence that direct integration is inadequate

Customers must demonstrate why their internal approach is costly or unsafe enough to replace. If direct integrations work well and customers prefer control, Ricarut does not have a strong wedge.

---

## What to do if the conditions fail

- **Pain exists but in a different segment:** change the ICP.
- **Pain exists but the buyer will not pay:** change the offer, buyer, or business model once and test again.
- **Customers pay but the abstraction does not reduce work:** rebuild the necessary provider/reconciliation layer.
- **Customers prefer direct integration:** consider selling testing/reconciliation tooling rather than orchestration, or stop.
- **Providers prohibit the model:** change the contractual/technical model or abandon those integrations.
- **The legal path destroys the economics:** change the funds flow or kill the thesis.
- **Customers do not care:** stop investing in the current idea. Do not disguise failure by counting signups or sandbox transactions.

---

## Suggested 30-day calendar

### Days 1–7

- Fix cross-project transfer and system-ledger isolation.
- Implement atomic settlement protection.
- Fix webhook matching.
- Add regression and concurrency tests.
- Build the first 50-company outreach list.
- Schedule the first ten interviews.

### Days 8–14

- Complete the first ten interviews.
- Score them consistently.
- Record evidence against the thesis.
- Review whether the segment is coherent.
- Invite only qualified companies into the design-partner test.

### Days 15–21

- Complete the next ten interviews.
- Secure named commitments from up to three design partners.
- Establish baseline measures and test dates.
- Run pricing conversations with companies that demonstrate real pain.
- Draft provider and legal flow diagrams based on the repeated workflow.

### Days 22–30

- Begin controlled two-week design-partner tests where scheduling permits.
- Present the paid-pilot offer to qualified partners.
- Select Provider A only if evidence supports the workflow.
- Start provider commercial/legal discovery before writing a live adapter.
- Review every kill criterion and make a written continue, reposition, rebuild, or kill decision.

## What success looks like on day 30

Success is not more code or a polished dashboard. Success is a trustworthy decision supported by evidence.

A strong result would be:

- Critical sandbox risks fixed with passing CI.
- Twenty completed interviews.
- At least four HIGH/EXTREME evidence-backed pain records.
- One repeated workflow with a clear user and buyer.
- Three qualified design partners.
- Two credible paid-pilot paths, preferably paid commitments.
- A justified Provider A choice.
- Draft funds, instruction, data, and reconciliation flows ready for counsel.

A well-supported decision to reposition or kill the thesis is also a successful validation outcome because it prevents greater waste.
