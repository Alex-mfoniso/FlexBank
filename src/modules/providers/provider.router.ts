import { ProviderRegistry, providerRegistry } from "./provider.registry";
import { FinancialProvider, TransferProvider } from "./contracts/provider.contracts";
import { ProviderCapability } from "./contracts/provider.types";
import {
  CurrencyNotSupportedError,
  InvalidTransferError,
  ProviderUnavailableError,
} from "../../lib/errors";
import { logger } from "../../lib/logger";

export interface RouteTransferParams {
  country?: string;
  currency: string;
  destinationType?: "bank_account" | "mobile_money";
  bankCode?: string;
  accountNumber?: string;
  phoneNumber?: string;
  explicitProvider?: string;
  requiredCapability?: ProviderCapability;
}

export interface RoutingDecision {
  providerId: string;
  provider: FinancialProvider;
  transferProvider: TransferProvider;
  country: string;
  currency: string;
  rail: "bank_transfer" | "mobile_money";
  matchedRule: string;
}

/**
 * Centralized Provider Routing Engine.
 * Decouples provider selection logic from controllers and domain services.
 * Dynamically resolves the optimal provider rail based on country, currency,
 * destination type, payment rail, and verified provider capabilities.
 */
export class ProviderRouter {
  constructor(private readonly registry: ProviderRegistry = providerRegistry) {}

  /**
   * Static helper for backward compatibility with legacy ledger transfers.
   */
  static select(params: {
    operation?: string;
    currency?: string;
    amount?: number;
    projectId?: string;
    country?: string;
  }): any {
    const legacyCapability = params.operation === "payment" ? "PAYMENT" : "TRANSFER";
    const legacyProviders = providerRegistry.getProvidersForCapability(legacyCapability);
    if (legacyProviders.length > 0) {
      return legacyProviders[0];
    }

    const route = providerRouter.resolveRoute({
      currency: params.currency || "NGN",
      country: params.country,
    });
    return (route.transferProvider as any) || (route.provider as any);
  }

  /**
   * Resolves the appropriate provider and financial rail for a transfer request.
   * Enforces strict capability validation to ensure the resolved provider can fulfill the transfer.
   */
  resolveRoute(params: RouteTransferParams): RoutingDecision {
    const {
      country,
      currency,
      destinationType,
      bankCode,
      accountNumber,
      phoneNumber,
      explicitProvider,
      requiredCapability = "transfers",
    } = params;

    const normalizedCurrency = (currency || "").toUpperCase();

    // 1. Explicit provider override requested by developer
    if (explicitProvider) {
      if (!this.registry.has(explicitProvider)) {
        throw new ProviderUnavailableError(
          `Requested provider "${explicitProvider}" is not registered or unavailable`,
        );
      }

      const provider = this.registry.get(explicitProvider)!;
      if (!provider.hasCapability(requiredCapability)) {
        throw new InvalidTransferError(
          `Provider "${explicitProvider}" does not support required capability "${requiredCapability}"`,
        );
      }

      const transferProvider = this.registry.resolveTransfer(explicitProvider);
      const isMpesa = explicitProvider === "mpesa";

      return {
        providerId: explicitProvider,
        provider,
        transferProvider,
        country: country || (isMpesa ? "KE" : "NG"),
        currency: normalizedCurrency,
        rail: isMpesa ? "mobile_money" : "bank_transfer",
        matchedRule: "explicit_override",
      };
    }

    // 2. Rule: Kenyan Mobile Money Rail (M-Pesa)
    // Matches if currency is KES, phone number is present, destination type is mobile_money, or country is KE
    const isKenyanMobileMoney =
      normalizedCurrency === "KES" ||
      destinationType === "mobile_money" ||
      Boolean(phoneNumber) ||
      country?.toUpperCase() === "KE";

    if (isKenyanMobileMoney) {
      if (normalizedCurrency && normalizedCurrency !== "KES") {
        throw new CurrencyNotSupportedError(
          `M-Pesa mobile money rail only supports KES, received "${normalizedCurrency}"`,
        );
      }

      const mpesaProvider = this.registry.get("mpesa");
      if (!mpesaProvider) {
        throw new ProviderUnavailableError("M-Pesa provider is currently unavailable");
      }

      if (!mpesaProvider.hasCapability(requiredCapability)) {
        throw new InvalidTransferError(
          `M-Pesa provider does not support capability "${requiredCapability}"`,
        );
      }

      const transferProvider = this.registry.resolveTransfer("mpesa");

      logger.debug(
        { currency: "KES", country: "KE", rail: "mobile_money" },
        "Routing engine matched Kenyan M-Pesa rail",
      );

      return {
        providerId: "mpesa",
        provider: mpesaProvider,
        transferProvider,
        country: "KE",
        currency: "KES",
        rail: "mobile_money",
        matchedRule: "rule_ke_mobile_money",
      };
    }

    // 3. Rule: Nigerian Commercial Bank Rail (Paystack)
    // Matches if currency is NGN, bank details are provided, destination type is bank_account, or country is NG
    const isNigerianBank =
      normalizedCurrency === "NGN" ||
      destinationType === "bank_account" ||
      Boolean(bankCode || accountNumber) ||
      country?.toUpperCase() === "NG";

    if (isNigerianBank) {
      if (normalizedCurrency && normalizedCurrency !== "NGN") {
        throw new CurrencyNotSupportedError(
          `Nigerian bank transfer rail only supports NGN, received "${normalizedCurrency}"`,
        );
      }

      const paystackProvider = this.registry.get("paystack");
      if (!paystackProvider) {
        throw new ProviderUnavailableError("Paystack provider is currently unavailable");
      }

      if (!paystackProvider.hasCapability(requiredCapability)) {
        throw new InvalidTransferError(
          `Paystack provider does not support capability "${requiredCapability}"`,
        );
      }

      const transferProvider = this.registry.resolveTransfer("paystack");

      logger.debug(
        { currency: "NGN", country: "NG", rail: "bank_transfer" },
        "Routing engine matched Nigerian Paystack bank rail",
      );

      return {
        providerId: "paystack",
        provider: paystackProvider,
        transferProvider,
        country: "NG",
        currency: "NGN",
        rail: "bank_transfer",
        matchedRule: "rule_ng_bank_transfer",
      };
    }

    // 4. No matching provider rail found
    throw new InvalidTransferError(
      `No supported financial provider rail found for currency "${normalizedCurrency || "unknown"}" and destination type "${destinationType || "unknown"}"`,
    );
  }
}

export const providerRouter = new ProviderRouter();
