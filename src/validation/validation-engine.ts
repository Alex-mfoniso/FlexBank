export const DISCOVERY_STATUSES = [
  "PROSPECT",
  "CONTACTED",
  "INTERVIEWED",
  "QUALIFIED",
  "DESIGN_PARTNER",
  "PILOT",
  "PAID",
  "LOST",
  "NOT_ICP",
] as const;

export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number];
export type EvidenceKind = "DIRECT_QUOTE" | "OBSERVED_BEHAVIOR" | "CLAIM" | "ASSUMPTION";
export type EvidenceLabel = "ACTUAL" | "TARGET" | "ASSUMED";
export type PainBand = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export interface PainScoreInput {
  frequency: number;
  financialImpact: number;
  engineeringEffort: number;
  operationalEffort: number;
  urgency: number;
  workaroundWeakness: number;
}

export interface PainScoreResult {
  total: number;
  band: PainBand;
}

export interface LabeledMoney {
  amount: number;
  currency: string;
  label: "CUSTOMER_PROVIDED" | "ASSUMED";
}

export interface RoiInput {
  providers: number;
  engineeringHoursPerIntegration: number;
  engineeringHourlyCost: LabeledMoney;
  monthlyReconciliationHours: number;
  operationsHourlyCost: LabeledMoney;
  monthlyIncidentFrequency: number;
  incidentRecoveryHours: number;
  ricarutMonthlyCost: LabeledMoney;
}

export interface RoiResult {
  currency: string;
  oneTimeIntegrationCost: number;
  monthlyReconciliationCost: number;
  monthlyIncidentCost: number;
  monthlyCurrentOperatingCost: number;
  monthlyDifferenceBeforeIntegrationAmortization: number;
  containsAssumptions: boolean;
  disclaimer: string;
}

export interface FunnelCounts {
  prospects: number;
  interviews: number;
  qualified: number;
  designPartners: number;
  technicalPilots: number;
  paidPilots: number;
  productionCustomers: number;
}

const assertScore = (name: string, score: number): void => {
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error(`${name} must be an integer from 1 to 5`);
  }
};

const assertNonNegative = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite, non-negative number`);
  }
};

export const calculatePainScore = (input: PainScoreInput): PainScoreResult => {
  const values = Object.entries(input);
  values.forEach(([name, value]) => assertScore(name, value));
  const total = values.reduce((sum, [, value]) => sum + value, 0);

  if (total <= 10) return { total, band: "LOW" };
  if (total <= 18) return { total, band: "MEDIUM" };
  if (total <= 24) return { total, band: "HIGH" };
  return { total, band: "EXTREME" };
};

export const calculateRoi = (input: RoiInput): RoiResult => {
  if (input.engineeringHourlyCost.currency !== input.operationsHourlyCost.currency ||
      input.engineeringHourlyCost.currency !== input.ricarutMonthlyCost.currency) {
    throw new Error("All ROI amounts must use the same currency");
  }

  Object.entries({
    providers: input.providers,
    engineeringHoursPerIntegration: input.engineeringHoursPerIntegration,
    engineeringHourlyCost: input.engineeringHourlyCost.amount,
    monthlyReconciliationHours: input.monthlyReconciliationHours,
    operationsHourlyCost: input.operationsHourlyCost.amount,
    monthlyIncidentFrequency: input.monthlyIncidentFrequency,
    incidentRecoveryHours: input.incidentRecoveryHours,
    ricarutMonthlyCost: input.ricarutMonthlyCost.amount,
  }).forEach(([name, value]) => assertNonNegative(name, value));

  const oneTimeIntegrationCost =
    input.providers * input.engineeringHoursPerIntegration * input.engineeringHourlyCost.amount;
  const monthlyReconciliationCost =
    input.monthlyReconciliationHours * input.operationsHourlyCost.amount;
  const monthlyIncidentCost =
    input.monthlyIncidentFrequency * input.incidentRecoveryHours * input.operationsHourlyCost.amount;
  const monthlyCurrentOperatingCost = monthlyReconciliationCost + monthlyIncidentCost;
  const containsAssumptions = [
    input.engineeringHourlyCost,
    input.operationsHourlyCost,
    input.ricarutMonthlyCost,
  ].some((money) => money.label === "ASSUMED");

  return {
    currency: input.engineeringHourlyCost.currency,
    oneTimeIntegrationCost,
    monthlyReconciliationCost,
    monthlyIncidentCost,
    monthlyCurrentOperatingCost,
    monthlyDifferenceBeforeIntegrationAmortization:
      monthlyCurrentOperatingCost - input.ricarutMonthlyCost.amount,
    containsAssumptions,
    disclaimer: containsAssumptions
      ? "Scenario contains assumptions and is not evidence of savings."
      : "Inputs were customer-provided; results remain estimates and require customer confirmation.",
  };
};

export const calculateFunnelConversion = (
  numerator: number,
  denominator: number,
): number | null => {
  assertNonNegative("numerator", numerator);
  assertNonNegative("denominator", denominator);
  if (denominator === 0) return null;
  return numerator / denominator;
};

export const validateFunnel = (counts: FunnelCounts): void => {
  Object.entries(counts).forEach(([name, value]) => {
    if (!Number.isInteger(value)) throw new Error(`${name} must be an integer`);
    assertNonNegative(name, value);
  });

  const ordered = [
    counts.prospects,
    counts.interviews,
    counts.qualified,
    counts.designPartners,
    counts.technicalPilots,
    counts.paidPilots,
    counts.productionCustomers,
  ];
  if (ordered.some((value, index) => index > 0 && value > ordered[index - 1])) {
    throw new Error("Funnel stages cannot exceed their preceding stage");
  }
};

export const isQualifiedDesignPartner = (criteria: {
  problemExistsToday: boolean;
  measurableCost: boolean;
  willingToTest: boolean;
  providesTechnicalFeedback: boolean;
  realisticPathToPayment: boolean;
}): boolean => Object.values(criteria).every(Boolean);

