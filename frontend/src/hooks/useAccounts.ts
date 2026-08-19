import { useState, useEffect, useCallback } from "react";
import { accountService } from "../services/account.service";
import type { Account } from "../types";

export const useAccounts = (projectId: string | null, filterParams?: { customerId?: string }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await accountService.list(filterParams);
      setAccounts(data);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve accounts.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, filterParams?.customerId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const createAccount = async (payload: { customerId: string; currency: string; name: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await accountService.create(payload);
      await fetchAccounts();
      return result;
    } catch (err: any) {
      setError(err.message || "Failed to create ledger account.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAccountStatus = async (id: string, status: "active" | "frozen" | "closed") => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await accountService.update(id, { status });
      await fetchAccounts();
      return result;
    } catch (err: any) {
      setError(err.message || "Failed to update account status.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    accounts,
    isLoading,
    error,
    refresh: fetchAccounts,
    createAccount,
    updateAccountStatus,
  };
};
