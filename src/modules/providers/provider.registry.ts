import { env } from "../../config/env";
import {
  FinancialProvider,
  AccountVerificationProvider,
  RecipientProvider,
  TransferProvider,
  WebhookProvider,
} from "./contracts/provider.contracts";
import { ProviderUnavailableError } from "./provider.errors";
import { PaystackAdapter } from "./paystack/paystack.adapter";
import { MpesaB2CAdapter } from "./mpesa/mpesa.adapter";
import { PaymentProvider } from "./provider.interface";
import { FakePaymentProvider } from "./adapters/fake-provider/fake-provider.adapter";

export type AnyProvider = FinancialProvider | PaymentProvider;

/**
 * Registry and service locator for external financial providers.
 * Manages provider lifecycle, resolution of default providers, and capability discovery.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, AnyProvider>();

  constructor() {
    // Automatically register default Paystack financial provider
    this.register(new PaystackAdapter());
    // Automatically register Safaricom M-Pesa financial provider
    this.register(new MpesaB2CAdapter());
    // Register legacy fake provider for existing transfer test harness compatibility
    this.register(new FakePaymentProvider());
  }

  /**
   * Registers a financial provider adapter.
   */
  register(provider: AnyProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Looks up a provider by its identifier.
   */
  get(id: string): any {
    return this.providers.get(id);
  }

  /**
   * Checks whether a provider with the given identifier is registered.
   */
  has(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Returns all registered providers.
   */
  getAll(): AnyProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Alias for getAll() to discover registered providers.
   */
  listProviders(): AnyProvider[] {
    return this.getAll();
  }


  /**
   * Returns all registered modern FinancialProviders.
   */
  getAllFinancialProviders(): FinancialProvider[] {
    return Array.from(this.providers.values()).filter(
      (p): p is FinancialProvider => "verifyConnectivity" in p,
    );
  }

  /**
   * Retrieves the configured default financial provider identifier from environment.
   */
  getDefaultProviderId(): string {
    return env.DEFAULT_FINANCIAL_PROVIDER || "paystack";
  }

  /**
   * Resolves the requested financial provider, or falls back to the configured default provider.
   * Throws ProviderUnavailableError if the provider is not registered.
   */
  resolve(providerId?: string): FinancialProvider {
    const id = providerId || this.getDefaultProviderId();
    const provider = this.providers.get(id);

    if (!provider) {
      throw new ProviderUnavailableError(
        id,
        `Financial provider '${id}' is not registered or unavailable`,
      );
    }

    return provider as FinancialProvider;
  }

  /**
   * Resolves a provider that implements the AccountVerificationProvider capability.
   */
  resolveAccountVerification(providerId?: string): FinancialProvider & AccountVerificationProvider {
    const provider = this.resolve(providerId);
    if (!("resolveAccount" in provider)) {
      throw new ProviderUnavailableError(
        provider.id,
        `Financial provider '${provider.id}' does not support account verification`,
      );
    }
    return provider as unknown as FinancialProvider & AccountVerificationProvider;
  }

  /**
   * Resolves a provider that implements the RecipientProvider capability.
   */
  resolveRecipient(providerId?: string): FinancialProvider & RecipientProvider {
    const provider = this.resolve(providerId);
    if (!("createRecipient" in provider)) {
      throw new ProviderUnavailableError(
        provider.id,
        `Financial provider '${provider.id}' does not support recipient management`,
      );
    }
    return provider as unknown as FinancialProvider & RecipientProvider;
  }

  /**
   * Resolves a provider that implements the TransferProvider capability.
   */
  resolveTransfer(providerId?: string): FinancialProvider & TransferProvider {
    const provider = this.resolve(providerId);
    if (!("initiateTransfer" in provider)) {
      throw new ProviderUnavailableError(
        provider.id,
        `Financial provider '${provider.id}' does not support transfer operations`,
      );
    }
    return provider as unknown as FinancialProvider & TransferProvider;
  }

  /**
   * Resolves a provider that implements the WebhookProvider capability.
   */
  resolveWebhook(providerId?: string): FinancialProvider & WebhookProvider {
    const provider = this.resolve(providerId);
    if (!("verifyWebhookSignature" in provider)) {
      throw new ProviderUnavailableError(
        provider.id,
        `Financial provider '${provider.id}' does not support webhook processing`,
      );
    }
    return provider as unknown as FinancialProvider & WebhookProvider;
  }

  /**
   * Legacy helper for existing transfer router: returns providers matching legacy capability.
   */
  getProvidersForCapability(capability: any): PaymentProvider[] {
    return this.getAll().filter(
      (p): p is PaymentProvider =>
        "capabilities" in p && Array.isArray((p as any).capabilities) && (p as any).capabilities.includes(capability),
    );
  }

  /**
   * Clears all registered providers (primarily used in unit test isolation).
   */
  clear(): void {
    this.providers.clear();
  }
}

export const providerRegistry = new ProviderRegistry();
