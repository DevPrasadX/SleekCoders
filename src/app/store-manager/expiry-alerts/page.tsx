'use client';

import { useMemo, useState } from 'react';
import { useLots, useProducts, useSuppliers } from '@/hooks/useApiData';

type Priority = 'Critical' | 'High Priority' | 'Medium Priority';

type AlertRecord = {
  lotId: number;
  lotName: string;
  supplierName: string;
  quantity: number;
  productCount: number;
  arrivalDate: string;
  priority: Priority;
};

export default function ExpiryAlerts() {
  const [selectedPriority, setSelectedPriority] = useState<Priority>('Critical');
  const { data: lots, loading: lotsLoading, error: lotsError, refresh: refreshLots } = useLots();
  const {
    data: suppliers,
    loading: suppliersLoading,
    error: suppliersError,
    refresh: refreshSuppliers,
  } = useSuppliers();
  const { data: products, loading: productsLoading, error: productsError, refresh: refreshProducts } = useProducts();

  const alerts = useMemo<AlertRecord[]>(() => {
    return lots.map((lot) => {
      let priority: Priority = 'Medium Priority';
      if (lot.LOT_QUANTITY <= 40) {
        priority = 'Critical';
      } else if (lot.LOT_QUANTITY <= 80) {
        priority = 'High Priority';
      }

      const supplierName =
        suppliers.find((supplier) => supplier.SUPPLIER_ID === lot.SUPPLIER_ID)?.SUPPLIER_NAME ||
        'Unknown Supplier';

      return {
        lotId: lot.LOT_ID,
        lotName: lot.LOT_NAME,
        supplierName,
        quantity: lot.LOT_QUANTITY,
        productCount: lot.LOT_PRODUCT_COUNT,
        arrivalDate: lot.LOT_DATE_OF_ARRIVAL,
        priority,
      };
    });
  }, [lots, suppliers]);

  const priorityCounts = alerts.reduce(
    (acc, alert) => {
      acc[alert.priority] = (acc[alert.priority] || 0) + 1;
      return acc;
    },
    { 'Critical': 0, 'High Priority': 0, 'Medium Priority': 0 } as Record<Priority, number>,
  );

  const filteredAlerts = alerts.filter((alert) => alert.priority === selectedPriority);

  const loading = lotsLoading || suppliersLoading || productsLoading;
  const error = lotsError || suppliersError || productsError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Expiry Alerts Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage upcoming expirations and apply promotional markdowns.</p>
        </div>
        {error && (
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
            onClick={() => {
              refreshLots();
              refreshSuppliers();
              refreshProducts();
            }}
          >
            Retry data sync
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard title="Critical Alerts" value={priorityCounts['Critical']} description="≤ 40 units remaining" color="red" />
        <SummaryCard title="High Priority" value={priorityCounts['High Priority']} description="41-80 units remaining" color="orange" />
        <SummaryCard title="Medium Priority" value={priorityCounts['Medium Priority']} description="> 80 units remaining" color="yellow" />
        <SummaryCard title="Active Products" value={products.length} description="From Product table" isInput />
      </div>

      {loading && <div className="bg-white rounded-lg border p-4 text-sm text-gray-600">Loading alerts...</div>}

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <TabButton
          label={`Critical (${priorityCounts['Critical']})`}
          isActive={selectedPriority === 'Critical'}
          onClick={() => setSelectedPriority('Critical')}
        />
        <TabButton
          label={`High Priority (${priorityCounts['High Priority']})`}
          isActive={selectedPriority === 'High Priority'}
          onClick={() => setSelectedPriority('High Priority')}
        />
        <TabButton
          label={`Medium Priority (${priorityCounts['Medium Priority']})`}
          isActive={selectedPriority === 'Medium Priority'}
          onClick={() => setSelectedPriority('Medium Priority')}
        />
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAlerts.map((alert) => (
          <AlertCard key={alert.lotId} alert={alert} />
        ))}
        {!filteredAlerts.length && !loading && (
          <div className="bg-white rounded-lg border p-6 col-span-full text-sm text-gray-500">
            No alerts in this priority bucket.
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, description, color, isInput }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      {isInput ? (
        <input
          type="text"
          value={value}
          readOnly
          className="text-2xl font-bold text-gray-800 w-full bg-gray-50 px-3 py-2 rounded border border-gray-200"
        />
      ) : (
        <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
      )}
      <div className="text-sm text-gray-500">{description}</div>
    </div>
  );
}

function TabButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
        isActive
          ? 'border-blue-600 text-blue-600 bg-blue-50'
          : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

function AlertCard({ alert }: { alert: AlertRecord }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      <div className="absolute top-4 right-4">
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <div className="flex space-x-2 mb-4">
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${
            alert.priority === 'Critical'
              ? 'bg-red-100 text-red-700'
              : alert.priority === 'High Priority'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {alert.priority}
        </span>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          Supplier Alert
        </span>
      </div>

      <h3 className="text-xl font-bold text-gray-800 mb-4">{alert.lotName}</h3>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Supplier:</span>
          <span className="text-gray-800 font-medium">{alert.supplierName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Quantity:</span>
          <span className="text-gray-800 font-medium">{alert.quantity} units</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Products in lot:</span>
          <span className="text-gray-800 font-medium">{alert.productCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Arrival Date:</span>
          <span className="text-gray-800 font-medium">{alert.arrivalDate}</span>
        </div>
      </div>

      <div className="flex space-x-3">
        <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Trigger Restock</span>
        </button>
        <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>View Lot</span>
        </button>
      </div>
    </div>
  );
}

