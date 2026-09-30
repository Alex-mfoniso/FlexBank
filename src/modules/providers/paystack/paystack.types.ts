export interface PaystackApiResponse<T = unknown> {
  status: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
  code?: string;
  type?: string;
}

export interface PaystackRequestOptions {
  timeoutMs?: number;
  requestId?: string;
  headers?: Record<string, string>;
}

export interface PaystackConnectivityResult {
  provider: "paystack";
  connected: boolean;
  latencyMs?: number;
  error?: string;
}
