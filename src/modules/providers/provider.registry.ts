import { PaymentProvider, ProviderCapability } from "./provider.interface";
import { FakePaymentProvider } from "./adapters/fake-provider/fake-provider.adapter";

export class ProviderRegistry {
  private providers = new Map<string, PaymentProvider>();

  register(provider: PaymentProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): PaymentProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }

  getProvidersForCapability(capability: ProviderCapability): PaymentProvider[] {
    return this.getAll().filter((p) => p.capabilities.includes(capability));
  }

  clear(): void {
    this.providers.clear();
  }
}

export const providerRegistry = new ProviderRegistry();
providerRegistry.register(new FakePaymentProvider());
