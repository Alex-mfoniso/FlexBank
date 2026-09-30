import { providerRegistry, ProviderRegistry } from "./provider.registry";
import {
  ProviderAccount,
  ProviderRecipient,
  ProviderTransfer,
  ProviderWebhookEvent,
  ProviderConnectivityCheck,
  ResolveAccountParams,
  CreateRecipientParams,
  InitiateTransferParams,
  VerifyTransferParams,
} from "./contracts/provider.types";
import { FinancialProvider } from "./contracts/provider.contracts";

/**
 * Ricarut Financial Service.
 * Central service layer through which Ricarut domain operations interact with external providers.
 *
 * Architecture:
 * Ricarut API
 *      ↓
 * Ricarut Financial Service (FinancialService)
 *      ↓
 * Provider Contract (FinancialProvider & capability interfaces)
 *      ↓
 * Provider Adapter (PaystackAdapter)
 *      ↓
 * Provider Client (PaystackClient)
 *      ↓
 * Upstream API (Paystack API)
 */
export class FinancialService {
  constructor(private readonly registry: ProviderRegistry = providerRegistry) {}

  /**
   * Resolves a bank account using the active financial provider.
   */
  async resolveAccount(params: ResolveAccountParams, providerId?: string): Promise<ProviderAccount> {
    const provider = this.registry.resolveAccountVerification(providerId);
    return provider.resolveAccount(params);
  }

  /**
   * Registers a transfer recipient (counterparty) with the active financial provider.
   */
  async createRecipient(params: CreateRecipientParams, providerId?: string): Promise<ProviderRecipient> {
    const provider = this.registry.resolveRecipient(providerId);
    return provider.createRecipient(params);
  }

  /**
   * Initiates an outbound financial transfer via the active financial provider.
   */
  async initiateTransfer(params: InitiateTransferParams, providerId?: string): Promise<ProviderTransfer> {
    const provider = this.registry.resolveTransfer(providerId);
    return provider.initiateTransfer(params);
  }

  /**
   * Verifies the status of a transfer via the active financial provider.
   */
  async verifyTransfer(params: VerifyTransferParams, providerId?: string): Promise<ProviderTransfer> {
    const provider = this.registry.resolveTransfer(providerId);
    return provider.verifyTransfer(params);
  }

  /**
   * Validates the cryptographic signature of an incoming webhook callback.
   */
  verifyWebhookSignature(signature: string, payload: string | Buffer, providerId?: string): boolean {
    const provider = this.registry.resolveWebhook(providerId);
    return provider.verifyWebhookSignature(signature, payload);
  }

  /**
   * Parses and normalizes an incoming webhook event.
   */
  parseWebhookEvent(payload: unknown, providerId?: string): ProviderWebhookEvent {
    const provider = this.registry.resolveWebhook(providerId);
    return provider.parseWebhookEvent(payload);
  }

  /**
   * Performs a connectivity check against a specific provider.
   */
  async verifyProvider(providerId?: string): Promise<ProviderConnectivityCheck> {
    const provider = this.registry.resolve(providerId);
    return provider.verifyConnectivity();
  }

  /**
   * Performs connectivity checks against all registered financial providers.
   */
  async verifyAllProviders(): Promise<ProviderConnectivityCheck[]> {
    const providers = this.registry.getAllFinancialProviders();
    return Promise.all(providers.map((p) => p.verifyConnectivity()));
  }

  /**
   * Retrieves a specific registered financial provider.
   */
  getProvider(providerId: string): FinancialProvider | undefined {
    const provider = this.registry.get(providerId);
    if (provider && "verifyConnectivity" in provider) {
      return provider as FinancialProvider;
    }
    return undefined;
  }

  /**
   * Returns all registered financial providers.
   */
  getAllProviders(): FinancialProvider[] {
    return this.registry.getAllFinancialProviders();
  }
}

export const financialService = new FinancialService();
