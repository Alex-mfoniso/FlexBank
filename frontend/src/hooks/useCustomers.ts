import { useState, useEffect, useCallback } from "react";
import { customerService } from "../services/customer.service";
import type { Customer } from "../types";

export const useCustomers = (projectId: string | null) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await customerService.list();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch customers.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const createCustomer = async (payload: {
    externalId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await customerService.create(payload);
      await fetchCustomers();
      return result;
    } catch (err: any) {
      setError(err.message || "Failed to create customer.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    customers,
    isLoading,
    error,
    refresh: fetchCustomers,
    createCustomer,
  };
};
