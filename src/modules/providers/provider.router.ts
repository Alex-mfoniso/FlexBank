import { PaymentProvider } from "./provider.interface";
import { providerRegistry } from "./provider.registry";
import { ProviderUnavailableError } from "../../lib/errors";

export class ProviderRouter {
  static select(params: {
    operation: "transfer" | "payment";
    currency: string;
    amount: number;
    projectId: string;
  }): PaymentProvider {
    const capability = params.operation === "transfer" ? "TRANSFER" : "PAYMENT";
    const available = providerRegistry.getProvidersForCapability(capability);

    if (available.length === 0) {
      throw new ProviderUnavailableError(`No registered provider supports capability: ${capability}`);
    }

    // For the MVP, we pick the first registered provider (which will be our Sandbox/Fake provider).
    // Future routing optimizations can easily be layered here.
    return available[0];
  }
}
