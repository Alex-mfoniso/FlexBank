import { useState, useEffect, useCallback, useRef } from "react";
import { transferService } from "../services/transfer.service";
import type { InitiateTransferPayload } from "../services/transfer.service";
import type { Transfer } from "../types";

export const useTransfers = (
  projectId: string | null,
  filters?: {
    status?: string;
    type?: string;
    customerId?: string;
    sourceAccountId?: string;
    reference?: string;
  }
) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Keep track of pending polling intervals to avoid leaks (Section 45)
  const pollTimerRef = useRef<any>(null);

  const fetchTransfers = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await transferService.list(filters);
      setTransfers(data);
    } catch (err: any) {
      setError(err.message || "Failed to list transactions.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, JSON.stringify(filters)]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Clean up any remaining liveness timers on unmount (Section 45)
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const initiateTransfer = async (payload: InitiateTransferPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await transferService.initiate(payload);
      await fetchTransfers();
      return result;
    } catch (err: any) {
      setError(err.message || "Failed to initiate transfer.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Actively polls a processing transfer's status in the background,
   * updating local states dynamically until a terminal status is confirmed.
   */
  const pollTransferStatus = useCallback((transferId: string, onTerminalStatus?: (finalTransfer: Transfer) => void) => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    const poll = async () => {
      try {
        const updated = await transferService.syncStatus(transferId);
        
        // Update list inline without forcing complete loader triggers
        setTransfers((prev) =>
          prev.map((t) => (t.id === transferId ? updated : t))
        );

        const terminalStatuses = ["successful", "failed", "cancelled", "reversed"];
        if (terminalStatuses.includes(updated.status)) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          if (onTerminalStatus) {
            onTerminalStatus(updated);
          }
        }
      } catch (err) {
        console.error("Liveness status inquiry error during transfer poll", err);
      }
    };

    // Execute first synchronization immediately, then schedule recurring checks
    poll();
    pollTimerRef.current = setInterval(poll, 4000);
  }, []);

  return {
    transfers,
    isLoading,
    error,
    refresh: fetchTransfers,
    initiateTransfer,
    pollTransferStatus,
  };
};
