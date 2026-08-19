export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(400, "VALIDATION_ERROR", message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT_ERROR", message);
  }
}

export class DuplicateExternalIdError extends AppError {
  constructor(message: string = "Customer with this external ID already exists in this project") {
    super(409, "DUPLICATE_EXTERNAL_ID", message);
  }
}

export class CustomerNotFoundError extends AppError {
  constructor(message: string = "Customer not found") {
    super(404, "CUSTOMER_NOT_FOUND", message);
  }
}

export class AccountNotFoundError extends AppError {
  constructor(message: string = "Account not found") {
    super(404, "ACCOUNT_NOT_FOUND", message);
  }
}

export class InvalidAccountStateError extends AppError {
  constructor(message: string = "Invalid account state") {
    super(400, "INVALID_ACCOUNT_STATE", message);
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message: string = "Insufficient available balance") {
    super(400, "INSUFFICIENT_FUNDS", message);
  }
}

export class CurrencyMismatchError extends AppError {
  constructor(message: string = "Currency mismatch") {
    super(400, "CURRENCY_MISMATCH", message);
  }
}

export class InvalidAmountError extends AppError {
  constructor(message: string = "Invalid amount") {
    super(400, "INVALID_AMOUNT", message);
  }
}

export class AccountNotActiveError extends AppError {
  constructor(message: string = "Account is not active") {
    super(400, "ACCOUNT_NOT_ACTIVE", message);
  }
}

export class JournalNotFoundError extends AppError {
  constructor(message: string = "Journal not found") {
    super(404, "JOURNAL_NOT_FOUND", message);
  }
}

export class JournalNotBalancedError extends AppError {
  constructor(message: string = "Journal entries must balance (sum of debits must equal sum of credits)") {
    super(400, "JOURNAL_NOT_BALANCED", message);
  }
}

export class JournalAlreadyPostedError extends AppError {
  constructor(message: string = "Journal is already posted and immutable") {
    super(400, "JOURNAL_ALREADY_POSTED", message);
  }
}

export class JournalAlreadyReversedError extends AppError {
  constructor(message: string = "Journal is already reversed") {
    super(400, "JOURNAL_ALREADY_REVERSED", message);
  }
}

export class IdempotencyKeyReusedError extends AppError {
  constructor(message: string = "Idempotency key reused with a different request payload") {
    super(400, "IDEMPOTENCY_KEY_REUSED", message);
  }
}

export class ReferenceAlreadyExistsError extends AppError {
  constructor(message: string = "Developer reference already exists") {
    super(409, "REFERENCE_ALREADY_EXISTS", message);
  }
}

export class ReconciliationFailureError extends AppError {
  constructor(message: string = "Reconciliation failure") {
    super(400, "RECONCILIATION_FAILURE", message);
  }
}

export class ProviderUnavailableError extends AppError {
  constructor(message: string = "Payment provider is currently unavailable") {
    super(503, "PROVIDER_UNAVAILABLE", message);
  }
}

export class ProviderTimeoutError extends AppError {
  constructor(message: string = "Payment provider request timed out") {
    super(504, "PROVIDER_TIMEOUT", message);
  }
}

export class ProviderRejectedError extends AppError {
  constructor(message: string = "Payment provider rejected the operation") {
    super(400, "PROVIDER_REJECTED", message);
  }
}

export class BeneficiaryInvalidError extends AppError {
  constructor(message: string = "The specified beneficiary details are invalid") {
    super(400, "BENEFICIARY_INVALID", message);
  }
}

export class ProviderTransactionNotFoundError extends AppError {
  constructor(message: string = "Provider transaction not found") {
    super(404, "PROVIDER_TRANSACTION_NOT_FOUND", message);
  }
}

export class WebhookSignatureInvalidError extends AppError {
  constructor(message: string = "Webhook signature verification failed") {
    super(401, "WEBHOOK_SIGNATURE_INVALID", message);
  }
}

export class WebhookAlreadyProcessedError extends AppError {
  constructor(message: string = "Webhook event has already been processed") {
    super(400, "WEBHOOK_ALREADY_PROCESSED", message);
  }
}

export class UnknownProviderStatusError extends AppError {
  constructor(message: string = "Returned provider status is unknown or unsupported") {
    super(400, "UNKNOWN_PROVIDER_STATUS", message);
  }
}

export class CurrencyNotSupportedError extends AppError {
  constructor(message: string = "The requested currency is not supported") {
    super(400, "CURRENCY_NOT_SUPPORTED", message);
  }
}

export class TransferLimitExceededError extends AppError {
  constructor(message: string = "Transfer limit exceeded") {
    super(400, "TRANSFER_LIMIT_EXCEEDED", message);
  }
}

export class TransferNotFoundError extends AppError {
  constructor(message: string = "Transfer record not found") {
    super(404, "TRANSFER_NOT_FOUND", message);
  }
}

export class InvalidTransferError extends AppError {
  constructor(message: string = "Invalid transfer details") {
    super(400, "INVALID_TRANSFER", message);
  }
}

export class InvalidTransferStateError extends AppError {
  constructor(message: string = "Invalid transfer state transition") {
    super(400, "INVALID_TRANSFER_STATE", message);
  }
}


