import { describe, expect, it } from "vitest";
import {
  calculateFunnelConversion,
  calculatePainScore,
  calculateRoi,
  isQualifiedDesignPartner,
  validateFunnel,
} from "../src/validation/validation-engine";

describe("validation engine", () => {
  it("uses the fixed pain bands without adjustment", () => {
    expect(calculatePainScore({
      frequency: 4,
      financialImpact: 4,
      engineeringEffort: 4,
      operationalEffort: 4,
      urgency: 4,
      workaroundWeakness: 4,
    })).toEqual({ total: 24, band: "HIGH" });

    expect(calculatePainScore({
      frequency: 5,
      financialImpact: 5,
      engineeringEffort: 5,
      operationalEffort: 5,
      urgency: 5,
      workaroundWeakness: 5,
    })).toEqual({ total: 30, band: "EXTREME" });
  });

  it("rejects pain values outside one to five", () => {
    expect(() => calculatePainScore({
      frequency: 0,
      financialImpact: 1,
      engineeringEffort: 1,
      operationalEffort: 1,
      urgency: 1,
      workaroundWeakness: 1,
    })).toThrow(/frequency/);
  });

  it("labels an ROI scenario containing assumed money inputs", () => {
    const result = calculateRoi({
      providers: 2,
      engineeringHoursPerIntegration: 80,
      engineeringHourlyCost: { amount: 10000, currency: "NGN", label: "CUSTOMER_PROVIDED" },
      monthlyReconciliationHours: 20,
      operationsHourlyCost: { amount: 5000, currency: "NGN", label: "ASSUMED" },
      monthlyIncidentFrequency: 2,
      incidentRecoveryHours: 4,
      ricarutMonthlyCost: { amount: 100000, currency: "NGN", label: "ASSUMED" },
    });

    expect(result.oneTimeIntegrationCost).toBe(1600000);
    expect(result.monthlyCurrentOperatingCost).toBe(140000);
    expect(result.containsAssumptions).toBe(true);
    expect(result.disclaimer).toContain("not evidence");
  });

  it("returns null rather than inventing a conversion rate", () => {
    expect(calculateFunnelConversion(0, 0)).toBeNull();
  });

  it("rejects impossible funnels", () => {
    expect(() => validateFunnel({
      prospects: 1,
      interviews: 2,
      qualified: 0,
      designPartners: 0,
      technicalPilots: 0,
      paidPilots: 0,
      productionCustomers: 0,
    })).toThrow(/preceding stage/);
  });

  it("requires every design-partner qualification condition", () => {
    expect(isQualifiedDesignPartner({
      problemExistsToday: true,
      measurableCost: true,
      willingToTest: true,
      providesTechnicalFeedback: true,
      realisticPathToPayment: false,
    })).toBe(false);
  });
});

