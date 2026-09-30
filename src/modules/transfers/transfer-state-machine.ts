import { TransferStatus } from "@prisma/client";

/**
 * Valid state transitions for financial transfers.
 *
 * Terminal states:
 * - successful: may only transition to "reversed"
 * - failed: cannot transition anywhere
 * - reversed: cannot transition anywhere
 * - cancelled: cannot transition anywhere
 *
 * Active states:
 * - created: can transition to pending, processing, failed, cancelled
 * - pending: can transition to processing, successful, failed, cancelled
 * - processing: can transition to successful, failed, reversed
 */
export const ALLOWED_TRANSFER_TRANSITIONS: Record<TransferStatus, readonly TransferStatus[]> = {
  created: ["pending", "processing", "failed", "cancelled"],
  pending: ["processing", "successful", "failed", "cancelled"],
  processing: ["successful", "failed", "reversed"],
  successful: ["reversed"],
  failed: [],
  reversed: [],
  cancelled: [],
};

/**
 * Evaluates whether a state transition from `currentStatus` to `nextStatus` is permitted.
 * Identity transitions (currentStatus === nextStatus) are always allowed as idempotent no-ops.
 */
export function isValidTransferTransition(
  currentStatus: TransferStatus,
  nextStatus: TransferStatus,
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }
  const allowed = ALLOWED_TRANSFER_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}
