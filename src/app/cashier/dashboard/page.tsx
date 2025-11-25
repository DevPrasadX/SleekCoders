'use client';

import { useDashboardMetrics } from '@/hooks/useApiData';

export default function CashierDashboard() {
  const { totals, loading, error, refresh, products, lots } = useDashboardMetrics();
  const featuredProducts = products.slice(0, 4);
  const quickLots = lots.slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your inventory today.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Catalog SKUs" value={totals.productCount.toString()} description="Products available" icon={<BoxIcon />} />
        <MetricCard title="Units in Stock" value={totals.totalLotQuantity.toString()} description="Across all lots" icon={<ShipmentIcon />} />
        <MetricCard title="Suppliers" value={totals.supplierCount.toString()} description="Linked partners" icon={<ChartIcon />} />
        <MetricCard title="Staff" value={totals.employeeCount.toString()} description="Registered employees" icon={<WarningIcon />} iconColor="yellow" />
      </div>

      {(loading || error) && (
        <div className="bg-white border rounded-lg p-4 flex items-center justify-between">
          <div>
            {loading && <p className="text-sm text-gray-600">Refreshing clerk data...</p>}
            {error && <p className="text-sm text-red-600">Unable to load metrics</p>}
          </div>
          {!loading && error && (
            <button onClick={refresh} className="px-4 py-2 text-sm bg-blue-600 text-white rounded">
              Retry
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ItemsExpiringSoon items={featuredProducts} />
        <RecentShipments shipments={quickLots} />
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, description, icon, iconColor = 'blue', changeColor = 'green' }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      {icon && <div className="absolute top-6 right-6 opacity-20">{icon}</div>}
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
      {change && (
        <div className={`text-sm text-${changeColor}-600 flex items-center space-x-1`}>
          <span>{change}</span>
        </div>
      )}
      {description && <div className="text-sm text-gray-500">{description}</div>}
    </div>
  );
}

function ChartCard({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="h-64 flex items-center justify-center text-gray-400">
        Chart visualization would go here
      </div>
    </div>
  );
}

function ItemsExpiringSoon({ items }: { items: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Items Expiring Soon</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.productId ?? item.name} className="flex items-center justify-between border-b pb-4 last:border-0">
            <div>
              <div className="font-medium text-gray-800">{item.name}</div>
              <div className="text-sm text-gray-500">{item.category}</div>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700">
                $
                {typeof item.standardPrice === 'number'
                  ? item.standardPrice.toFixed(2)
                  : Number(item.standardPrice ?? 0).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Recommended price</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentShipments({ shipments }: { shipments: any[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Shipments</h3>
      <div className="space-y-4">
        {shipments.map((shipment) => (
          <div key={shipment.LOT_ID} className="flex items-center justify-between border-b pb-4 last:border-0">
            <div>
              <div className="font-medium text-gray-800">{shipment.LOT_NAME}</div>
              <div className="text-sm text-gray-500">Arrived {shipment.LOT_DATE_OF_ARRIVAL}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">{shipment.LOT_QUANTITY} units</div>
              <div className="inline-block px-3 py-1 rounded-full text-xs mt-1 bg-gray-100 text-gray-600">
                {shipment.LOT_PRODUCT_COUNT} SKUs
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoxIcon() {
  return (
    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ShipmentIcon() {
  return (
    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  );
}

