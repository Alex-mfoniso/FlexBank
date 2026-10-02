export type ProviderHealthStatus = "operational" | "degraded" | "unavailable";

export interface MetricDimensions {
  provider: string;
  country?: string;
  currency?: string;
  operation?: string;
}

export interface ProviderHealthReport {
  provider: string;
  status: ProviderHealthStatus;
  consecutiveFailures: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeoutRequests: number;
  successRatePercentage: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
}

/**
 * In-memory provider metrics and health registry.
 * Collects financial lifecycle telemetry and computes real-time provider health statuses.
 */
export class ProviderMetricsCollector {
  private requestsTotal = new Map<string, number>();
  private successTotal = new Map<string, number>();
  private failureTotal = new Map<string, number>();
  private timeoutTotal = new Map<string, number>();
  private webhooksReceivedTotal = new Map<string, number>();
  private webhookFailureTotal = new Map<string, number>();
  private reconciliationMismatchTotal = new Map<string, number>();

  // Health state tracking per provider
  private consecutiveFailures = new Map<string, number>();
  private lastFailureTimestamp = new Map<string, Date>();
  private lastSuccessTimestamp = new Map<string, Date>();

  private buildKey(dimensions: MetricDimensions): string {
    const { provider, country = "any", currency = "any", operation = "any" } = dimensions;
    return `${provider}:${country}:${currency}:${operation}`;
  }

  private increment(map: Map<string, number>, key: string, count = 1): void {
    map.set(key, (map.get(key) || 0) + count);
  }

  recordRequest(dims: MetricDimensions): void {
    const key = this.buildKey(dims);
    this.increment(this.requestsTotal, key);
    this.increment(this.requestsTotal, dims.provider);
  }

  recordSuccess(dims: MetricDimensions): void {
    const key = this.buildKey(dims);
    this.increment(this.successTotal, key);
    this.increment(this.successTotal, dims.provider);

    // Reset consecutive failures on success
    this.consecutiveFailures.set(dims.provider, 0);
    this.lastSuccessTimestamp.set(dims.provider, new Date());
  }

  recordFailure(dims: MetricDimensions, isTimeout = false): void {
    const key = this.buildKey(dims);
    this.increment(this.failureTotal, key);
    this.increment(this.failureTotal, dims.provider);

    if (isTimeout) {
      this.increment(this.timeoutTotal, key);
      this.increment(this.timeoutTotal, dims.provider);
    }

    const currentFailures = (this.consecutiveFailures.get(dims.provider) || 0) + 1;
    this.consecutiveFailures.set(dims.provider, currentFailures);
    this.lastFailureTimestamp.set(dims.provider, new Date());
  }

  recordWebhook(provider: string, success: boolean): void {
    this.increment(this.webhooksReceivedTotal, provider);
    if (!success) {
      this.increment(this.webhookFailureTotal, provider);
    }
  }

  recordReconciliationMismatch(provider: string): void {
    this.increment(this.reconciliationMismatchTotal, provider);
  }

  getHealth(provider: string): ProviderHealthReport {
    const total = this.requestsTotal.get(provider) || 0;
    const successes = this.successTotal.get(provider) || 0;
    const failures = this.failureTotal.get(provider) || 0;
    const timeouts = this.timeoutTotal.get(provider) || 0;
    const consecutive = this.consecutiveFailures.get(provider) || 0;

    let status: ProviderHealthStatus = "operational";

    if (consecutive >= 10) {
      status = "unavailable";
    } else if (consecutive >= 3 || (total >= 10 && failures / total > 0.3)) {
      status = "degraded";
    }

    const successRate = total > 0 ? Math.round((successes / total) * 10000) / 100 : 100;

    return {
      provider,
      status,
      consecutiveFailures: consecutive,
      totalRequests: total,
      successfulRequests: successes,
      failedRequests: failures,
      timeoutRequests: timeouts,
      successRatePercentage: successRate,
      lastFailureAt: this.lastFailureTimestamp.get(provider)?.toISOString() || null,
      lastSuccessAt: this.lastSuccessTimestamp.get(provider)?.toISOString() || null,
    };
  }

  getAllHealth(): Record<string, ProviderHealthReport> {
    return {
      paystack: this.getHealth("paystack"),
      mpesa: this.getHealth("mpesa"),
    };
  }

  getSnapshot(): Record<string, unknown> {
    const serializeMap = (map: Map<string, number>) => Object.fromEntries(map.entries());
    return {
      health: this.getAllHealth(),
      counters: {
        transfer_requests_total: serializeMap(this.requestsTotal),
        transfer_success_total: serializeMap(this.successTotal),
        transfer_failure_total: serializeMap(this.failureTotal),
        provider_timeout_total: serializeMap(this.timeoutTotal),
        webhook_received_total: serializeMap(this.webhooksReceivedTotal),
        webhook_processing_failure_total: serializeMap(this.webhookFailureTotal),
        reconciliation_mismatch_total: serializeMap(this.reconciliationMismatchTotal),
      },
    };
  }
}

export const providerMetrics = new ProviderMetricsCollector();
