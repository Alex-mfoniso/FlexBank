import { FinancialService, financialService } from "./financial.service";
import { providerRegistry } from "./provider.registry";
import { FinancialProvider } from "./contracts/provider.contracts";
import { ProviderConnectivityCheck } from "./contracts/provider.types";
import { NotFoundError } from "../../lib/errors";

/**
 * ProviderService adapter layer for backward compatibility with Phase 1.
 * Delegates directly to FinancialService and ProviderRegistry.
 */
export class ProviderService {
  constructor(private readonly financialSvc: FinancialService = financialService) {}

  public registerProvider(provider: FinancialProvider): void {
    providerRegistry.register(provider);
  }

  public getProvider(id: string): FinancialProvider | undefined {
    return this.financialSvc.getProvider(id);
  }

  public getAllProviders(): FinancialProvider[] {
    return this.financialSvc.getAllProviders();
  }

  public async verifyProvider(id: string): Promise<ProviderConnectivityCheck> {
    const provider = this.getProvider(id);
    if (!provider) {
      throw new NotFoundError(`Financial provider '${id}' is not registered`);
    }

    return provider.verifyConnectivity();
  }

  public async verifyAllProviders(): Promise<ProviderConnectivityCheck[]> {
    return this.financialSvc.verifyAllProviders();
  }
}

export const providerService = new ProviderService();
