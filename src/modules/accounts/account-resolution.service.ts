import { ProviderRegistry, providerRegistry } from "../providers/provider.registry";
import { AccountVerificationProvider } from "../providers/contracts/provider.contracts";

export interface ResolveAccountInput {
  bankCode: string;
  accountNumber: string;
  providerId?: string;
}

export interface NormalizedAccountResolution {
  account_number: string;
  account_name: string;
  bank_code: string;
  provider: string;
}

/**
 * Service orchestrating bank account verification and name resolution.
 * Strictly decoupled from specific providers via AccountVerificationProvider interface.
 */
export class AccountResolutionService {
  constructor(private readonly registry: ProviderRegistry = providerRegistry) {}

  /**
   * Resolves a bank account through the configured financial provider capability.
   */
  async resolveAccount(input: ResolveAccountInput): Promise<NormalizedAccountResolution> {
    const provider: AccountVerificationProvider = this.registry.resolveAccountVerification(input.providerId);

    const resolved = await provider.resolveAccount({
      accountNumber: input.accountNumber,
      bankCode: input.bankCode,
    });

    return {
      account_number: resolved.accountNumber,
      account_name: resolved.accountName,
      bank_code: resolved.bankCode,
      provider: resolved.provider,
    };
  }
}

export const accountResolutionService = new AccountResolutionService();
