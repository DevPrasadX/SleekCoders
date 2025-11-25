'use client';

import { useMemo, useState } from 'react';
import { useLots, useSuppliers } from '@/hooks/useApiData';

type InventoryRecord = {
  lotId: number;
  lotName: string;
  supplierName: string;
  units: number;
  productCount: number;
  arrivalDate: string;
  status: 'Healthy' | 'Needs Attention';
};

export default function ReceivingClerkStockInventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('All Suppliers');
  const [selectedStatus, setSelectedStatus] = useState<'All' | InventoryRecord['status']>('All');

  const { data: lots, loading: lotsLoading, error: lotsError, refresh: refreshLots } = useLots();
  const {
    data: suppliers,
    loading: suppliersLoading,
    error: suppliersError,
    refresh: refreshSuppliers,
  } = useSuppliers();

  const derivedRecords = useMemo<InventoryRecord[]>(() => {
    return lots.map((lot) => {
      const supplierName =
        suppliers.find((supplier) => supplier.SUPPLIER_ID === lot.SUPPLIER_ID)?.SUPPLIER_NAME ||
        'Unknown Supplier';
      const status: InventoryRecord['status'] = lot.LOT_QUANTITY >= 100 ? 'Healthy' : 'Needs Attention';
      return {
        lotId: lot.LOT_ID,
        lotName: lot.LOT_NAME,
        supplierName,
        units: lot.LOT_QUANTITY,
        productCount: lot.LOT_PRODUCT_COUNT,
        arrivalDate: lot.LOT_DATE_OF_ARRIVAL,
        status,
      };
    });
  }, [lots, suppliers]);

  const filteredItems = derivedRecords.filter((record) => {
    const matchesSearch =
      record.lotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSupplier =
      selectedSupplier === 'All Suppliers' || record.supplierName === selectedSupplier;
    const matchesStatus = selectedStatus === 'All' || record.status === selectedStatus;
    return matchesSearch && matchesSupplier && matchesStatus;
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedSupplier('All Suppliers');
    setSelectedStatus('All');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Stock Inventory</h1>
        <p className="text-gray-600 mt-1">Monitor and manage all inventory items with expiry tracking.</p>
      </div>

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
              placeholder="Search by name or batch..."
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
            <option>All Suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.SUPPLIER_ID} value={supplier.SUPPLIER_NAME}>
                {supplier.SUPPLIER_NAME}
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
          </select>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {filteredItems.length} of {derivedRecords.length} lots
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
        {(lotsLoading || suppliersLoading) && (
          <div className="p-4 text-sm text-gray-600">Loading inventory data...</div>
        )}
        {(lotsError || suppliersError) && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-sm text-red-700 flex items-center justify-between">
            <span>Failed to load data.</span>
            <button
              onClick={() => {
                refreshLots();
                refreshSuppliers();
              }}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded"
            >
              Retry
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.lotId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.lotName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.supplierName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.units}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.productCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.arrivalDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        item.status === 'Healthy' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
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
      </div>
    </div>
  );
}

