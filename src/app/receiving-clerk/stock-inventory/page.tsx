'use client';

import { useEffect, useMemo, useState } from 'react';

type InventoryRecord = {
  itemID: number;
  productName: string;
  productCategory: string;
  productPrice: number;
  barcode: string;
  lotName: string;
  supplierName: string | null;
  quantity: number;
  batchNumber: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  status: 'Healthy' | 'Needs Attention' | 'Expired';
};

export default function ReceivingClerkStockInventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('All Suppliers');
  const [selectedStatus, setSelectedStatus] = useState<'All' | InventoryRecord['status']>('All');
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = sessionStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserId(parsed.userId);
      } catch (err) {
        console.error('Failed to parse user session', err);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchInventory() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/inventory/items?employeeID=${encodeURIComponent(userId)}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || `Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as Array<{
          itemID: number;
          productName: string;
          productCategory: string;
          productPrice: number | string;
          barcode: string;
          lotName: string;
          supplierName: string | null;
          quantity: number;
          batchNumber: string | null;
          manufacturingDate: string | null;
          expiryDate: string | null;
        }>;

        if (isMounted) {
          const enriched = payload.map((item) => {
            const normalizedPrice = Number(item.productPrice);
            return {
              ...item,
              productPrice: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
              status: deriveStatus(item.quantity, item.expiryDate),
            };
          });
          setRecords(enriched);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load inventory');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchInventory();

    return () => {
      isMounted = false;
    };
  }, [userId, refreshKey]);

  const supplierOptions = useMemo(() => {
    const unique = new Set<string>();
    records.forEach((record) => {
      if (record.supplierName) {
        unique.add(record.supplierName);
      }
    });
    return ['All Suppliers', ...Array.from(unique)];
  }, [records]);

  const filteredItems = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch =
        record.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.lotName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSupplier =
        selectedSupplier === 'All Suppliers' || record.supplierName === selectedSupplier;

      const matchesStatus = selectedStatus === 'All' || record.status === selectedStatus;

      return matchesSearch && matchesSupplier && matchesStatus;
    });
  }, [records, searchTerm, selectedSupplier, selectedStatus]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedSupplier('All Suppliers');
    setSelectedStatus('All');
  };

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);

  const isEmptyState = !loading && filteredItems.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Received Products</h1>
          <p className="text-gray-600 mt-1">
            Review-only the SKUs you have registered. Other clerks cannot see these records.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={loading || !userId}
        >
          Refresh
        </button>
      </div>

      {!userId && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          Unable to determine the current user. Please log in again.
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="font-semibold text-gray-800">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by product, barcode or lot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {supplierOptions.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as InventoryRecord['status'] | 'All')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Status</option>
            <option value="Healthy">Healthy</option>
            <option value="Needs Attention">Needs Attention</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
          <div className="text-sm text-gray-600">
            Showing {filteredItems.length} of {records.length} items
          </div>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && <div className="p-4 text-sm text-gray-600">Loading inventory data...</div>}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={handleRefresh} className="px-3 py-1 text-xs bg-red-600 text-white rounded">
              Retry
            </button>
          </div>
        )}
        {isEmptyState && (
          <div className="p-6 text-center text-gray-500">
            No products match your filters yet. Add items from the Scan & Receive page.
          </div>
        )}
        {!isEmptyState && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.itemID} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div>{item.productName}</div>
                      <div className="text-xs text-gray-500">{item.productCategory}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.barcode}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{item.lotName}</div>
                      {item.batchNumber && <div className="text-xs text-gray-400">Batch: {item.batchNumber}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.supplierName || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.expiryDate ? item.expiryDate : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          item.status === 'Healthy'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'Expired'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function deriveStatus(quantity: number, expiryDate: string | null): InventoryRecord['status'] {
  if (expiryDate) {
    const expiry = new Date(expiryDate);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
      return 'Expired';
    }
  }
  if (quantity < 20) {
    return 'Needs Attention';
  }
  return 'Healthy';
}

