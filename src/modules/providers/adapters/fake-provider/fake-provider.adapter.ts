import { PaymentProvider, TransferRequest, ProviderTransferResult } from "../../provider.interface";
import crypto from "crypto";

export class FakePaymentProvider implements PaymentProvider {
  readonly id = "fake-provider";
  readonly capabilities = ["TRANSFER", "PAYMENT", "WEBHOOK"] as any;

  private readonly secretKey: string;

  constructor(secretKey = process.env.FAKE_PROVIDER_SECRET || "fake_secret_123") {
    this.secretKey = secretKey;
  }

  async createTransfer(request: TransferRequest): Promise<ProviderTransferResult> {
    const { reference } = request;

    // Simulate different scenarios based on reference patterns
    if (reference.includes("sim_timeout")) {
      throw new Error("PROVIDER_TIMEOUT");
    }

    if (reference.includes("sim_fail")) {
      return {
        providerReference: `prov_fail_${crypto.randomUUID().replace(/-/g, "")}`,
        status: "failed",
        rawResponse: { error: "Simulated beneficiary account is invalid" },
        failureCode: "BENEFICIARY_INVALID",
        failureMessage: "Simulated beneficiary account is invalid",
      };
    }

    if (
      reference.includes("sim_pending") ||
      reference.includes("sim_processing") ||
      reference.includes("sim_ambiguous")
    ) {
      return {
        providerReference: `prov_proc_${crypto.randomUUID().replace(/-/g, "")}`,
        status: "processing",
        rawResponse: { message: "Simulated transfer is in progress" },
      };
    }

    // Default: Success
    return {
      providerReference: `prov_succ_${crypto.randomUUID().replace(/-/g, "")}`,
      status: "successful",
      rawResponse: { message: "Simulated transfer executed successfully" },
    };
  }

  async getTransfer(providerReference: string, reference: string): Promise<ProviderTransferResult> {
    if (reference.includes("sim_timeout")) {
      throw new Error("PROVIDER_TIMEOUT");
    }

    if (reference.includes("sim_fail")) {
      return {
        providerReference,
        status: "failed",
        rawResponse: { error: "Failed" },
        failureCode: "PROVIDER_REJECTED",
        failureMessage: "Simulated transfer rejected by provider",
      };
    }

    if (
      reference.includes("sim_pending") ||
      reference.includes("sim_processing") ||
      reference.includes("sim_ambiguous")
    ) {
      return {
        providerReference,
        status: "processing",
        rawResponse: { message: "Simulated transfer remains processing" },
      };
    }

    return {
      providerReference,
      status: "successful",
      rawResponse: { message: "Simulated transfer is successful" },
    };
  }

  verifyWebhookSignature(signature: string, rawBody: string): boolean {
    const expected = crypto.createHmac("sha256", this.secretKey).update(rawBody).digest("hex");
    return signature === expected;
  }

  parseWebhookEvent(body: any) {
    const { eventId, eventType, providerReference, reference, status, failureCode, failureMessage } = body;
    return {
      providerEventId: eventId,
      eventType,
      providerReference,
      reference,
      status,
      failureCode,
      failureMessage,
      rawPayload: body,
    };
  }

  // Helper method to sign simulated webhook payloads for testing
  signPayload(payload: any): string {
    return crypto.createHmac("sha256", this.secretKey).update(JSON.stringify(payload)).digest("hex");
  }
}
