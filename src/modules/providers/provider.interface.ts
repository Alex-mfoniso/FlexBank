export type ProviderCapability = "TRANSFER" | "PAYMENT" | "WEBHOOK";

export interface TransferRequest {
  transferId: string;
  amount: number; // Integer minor units (e.g. kobo, cents)
  currency: string;
  beneficiary: {
    type: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
  };
  reference: string;
}

export interface ProviderTransferResult {
  providerReference: string;
  status: "pending" | "processing" | "successful" | "failed";
  rawResponse: any;
  failureCode?: string;
  failureMessage?: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly capabilities: ProviderCapability[];

  createTransfer(request: TransferRequest): Promise<ProviderTransferResult>;
  getTransfer(providerReference: string, reference: string): Promise<ProviderTransferResult>;
  verifyWebhookSignature(signature: string, rawBody: string): boolean;
  parseWebhookEvent(body: any): {
    providerEventId: string;
    eventType: string;
    providerReference: string;
    reference: string;
    status: "pending" | "processing" | "successful" | "failed";
    failureCode?: string;
    failureMessage?: string;
    rawPayload: any;
  };
}
