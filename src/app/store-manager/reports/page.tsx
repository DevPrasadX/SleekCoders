'use client';

import { useMemo } from 'react';
import { useDashboardMetrics, useLots, useProducts, useSuppliers } from '@/hooks/useApiData';

type ListItem = {
  label: string;
  value: string;
  subLabel?: string;
};

export default function Reports() {
  const dashboard = useDashboardMetrics();
  const lotsState = useLots();
  const productsState = useProducts();
  const suppliersState = useSuppliers();

  const { totals } = dashboard;
  const { data: lots } = lotsState;
  const { data: products } = productsState;
  const { data: suppliers } = suppliersState;

  const loading =
    dashboard.loading || lotsState.loading || productsState.loading || suppliersState.loading;
  const error =
    dashboard.error || lotsState.error || productsState.error || suppliersState.error;

  const metrics = useMemo(() => {
    const totalUnits = totals.totalLotQuantity;
    const totalProductCount = lots.reduce((sum, lot) => sum + lot.LOT_PRODUCT_COUNT, 0);
    const averageLotQuantity = lots.length ? Math.round(totalUnits / lots.length) : 0;
    const lowStockLots = lots.filter((lot) => lot.LOT_QUANTITY < 60).length;
    return { totalUnits, totalProductCount, averageLotQuantity, lowStockLots };
  }, [totals.totalLotQuantity, lots]);

  const supplierBreakdown = useMemo<ListItem[]>(() => {
    const map = new Map<number, number>();
    lots.forEach((lot) => {
      map.set(lot.SUPPLIER_ID, (map.get(lot.SUPPLIER_ID) ?? 0) + lot.LOT_QUANTITY);
    });
    return suppliers
      .map((supplier) => ({
        label: supplier.SUPPLIER_NAME,
        value: `${map.get(supplier.SUPPLIER_ID) ?? 0} units`,
        subLabel: `${supplier.SUPPLIER_PRODUCT_COUNT} SKUs`,
      }))
      .sort((a, b) => Number(b.value.split(' ')[0]) - Number(a.value.split(' ')[0]))
      .slice(0, 5);
  }, [lots, suppliers]);

  const categoryBreakdown = useMemo<ListItem[]>(() => {
    const counts = products.reduce<Record<string, number>>((acc, product) => {
      acc[product.category] = (acc[product.category] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([category, count]) => ({
        label: category,
        value: `${count} products`,
        sortValue: count,
      }))
      .sort((a, b) => b.sortValue - a.sortValue)
      .map(({ sortValue, ...rest }) => rest);
  }, [products]);

  const lowInventoryLots = useMemo(() => {
    return [...lots]
      .filter((lot) => lot.LOT_QUANTITY < 80)
      .sort((a, b) => a.LOT_QUANTITY - b.LOT_QUANTITY)
      .slice(0, 6)
      .map((lot) => ({
        lot,
        supplier:
          suppliers.find((supplier) => supplier.SUPPLIER_ID === lot.SUPPLIER_ID)?.SUPPLIER_NAME ||
          'Unknown',
      }));
  }, [lots, suppliers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Analyze expiry patterns and waste trends to optimize inventory management.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export All Reports</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Units in Lots"
          value={metrics.totalUnits.toString()}
          subtitle="Across all active lots"
          valueColor="green"
        />
        <MetricCard
          title="Products per Lot"
          value={metrics.totalProductCount.toString()}
          subtitle="Combined SKU count"
        />
        <MetricCard
          title="Average Lot Quantity"
          value={`${metrics.averageLotQuantity}`}
          subtitle="Mean units per lot"
        />
        <MetricCard
          title="Low Stock Lots"
          value={metrics.lowStockLots.toString()}
          subtitle="< 60 units remaining"
          valueColor="red"
        />
      </div>

      {(loading || error) && (
        <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
          <div>
            {loading && <p className="text-sm text-gray-600">Refreshing analytics...</p>}
            {error && (
              <p className="text-sm text-red-600">
                Unable to load one or more analytics feeds.
              </p>
            )}
          </div>
          {!loading && error && (
            <button
              onClick={() => {
                dashboard.refresh();
                lotsState.refresh();
                productsState.refresh();
                suppliersState.refresh();
              }}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BreakdownCard title="Supplier Coverage" items={supplierBreakdown} />
        <BreakdownCard title="Products by Category" items={categoryBreakdown} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendCard
          title="Inventory Health"
          description="Average units per supplier"
          value={`${Math.round(metrics.totalUnits / Math.max(suppliers.length, 1))} units`}
          items={supplierBreakdown.slice(0, 3)}
        />
        <LowStockTable lots={lowInventoryLots} />
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, valueColor = 'black', subtitleColor = 'gray' }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className={`text-3xl font-bold mb-1 ${
        valueColor === 'red' ? 'text-red-600' : valueColor === 'green' ? 'text-green-600' : 'text-gray-800'
      }`}>
        {value}
      </div>
      <div className={`text-sm ${
        subtitleColor === 'green' ? 'text-green-600' : 'text-gray-500'
      }`}>
        {subtitle}
      </div>
    </div>
  );
}

function BreakdownCard({ title, items }: { title: string; items: ListItem[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export</span>
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No data available yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800">{item.label}</div>
                {item.subLabel && <div className="text-xs text-gray-500">{item.subLabel}</div>}
              </div>
              <div className="text-sm font-semibold text-gray-800">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendCard({
  title,
  description,
  value,
  items,
}: {
  title: string;
  description: string;
  value: string;
  items: ListItem[];
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="text-3xl font-bold text-blue-600">{value}</div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{item.label}</span>
            <span className="text-sm font-semibold text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LowStockTable({
  lots,
}: {
  lots: { lot: ReturnType<typeof useLots>['data'][number]; supplier: string }[];
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Lots Needing Attention</h3>
        <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export</span>
        </button>
      </div>
      {lots.length === 0 ? (
        <p className="text-sm text-gray-500">All lots have healthy stock levels.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lot</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lots.map(({ lot, supplier }) => (
                <tr key={lot.LOT_ID}>
                  <td className="px-4 py-2 text-sm text-gray-900">{lot.LOT_NAME}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{supplier}</td>
                  <td className="px-4 py-2 text-sm text-red-600">{lot.LOT_QUANTITY}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{lot.LOT_PRODUCT_COUNT}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

