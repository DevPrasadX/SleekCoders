import { useEffect, useMemo, useState } from 'react';
import { EmployeeRecord, LotRecord, SupplierRecord } from '@/types/database';
import { Product } from '@/types';

type ApiState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

function useApiData<T>(endpoint: string, initialData: T): ApiState<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const payload = await response.json();
        if (isMounted) {
          setData(payload);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch data';
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [endpoint, refreshKey]);

  return {
    data,
    loading,
    error,
    refresh: () => setRefreshKey((prev) => prev + 1),
  };
}

export function useEmployees() {
  return useApiData<EmployeeRecord[]>('/api/employees', []);
}

export function useSuppliers() {
  return useApiData<SupplierRecord[]>('/api/suppliers', []);
}

export function useLots() {
  return useApiData<LotRecord[]>('/api/lots', []);
}

export function useProducts() {
  return useApiData<Product[]>('/api/products', []);
}

export function useDashboardMetrics() {
  const employees = useEmployees();
  const suppliers = useSuppliers();
  const lots = useLots();
  const products = useProducts();

  const totals = useMemo(() => {
    const totalLotQuantity = lots.data.reduce(
      (sum, lot) => sum + (lot.LOT_QUANTITY ?? 0),
      0,
    );
    const averageLotSize =
      lots.data.length > 0 ? totalLotQuantity / lots.data.length : 0;
    return {
      employeeCount: employees.data.length,
      supplierCount: suppliers.data.length,
      productCount: products.data.length,
      totalLotQuantity,
      averageLotSize,
    };
  }, [employees.data, suppliers.data, lots.data, products.data]);

  const loading =
    employees.loading || suppliers.loading || lots.loading || products.loading;
  const error =
    employees.error || suppliers.error || lots.error || products.error;

  return {
    totals,
    loading,
    error,
    refresh: () => {
      employees.refresh();
      suppliers.refresh();
      lots.refresh();
      products.refresh();
    },
    employees: employees.data,
    suppliers: suppliers.data,
    products: products.data,
    lots: lots.data,
  };
}

