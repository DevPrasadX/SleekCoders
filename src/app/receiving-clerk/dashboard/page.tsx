'use client';

import { stockItems, shipments } from '@/data/staticData';

export default function ReceivingClerkDashboard() {
  const expiringSoon = stockItems.filter(item => item.status === 'Near Expiry').length;
  const recentShipmentsCount = shipments.filter(s => s.status === 'Processed').length;
  const itemsExpiringSoon = stockItems.filter(item => item.status === 'Near Expiry').slice(0, 4);
  const recentShipments = shipments.slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your inventory today.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Stock Items"
          value="2,847"
          change="+12% from last month"
          changeColor="green"
          icon={<BoxIcon />}
        />
        <MetricCard
          title="Expiring Soon"
          value={expiringSoon.toString()}
          description="Within next 7 days"
          icon={<WarningIcon />}
          iconColor="yellow"
        />
        <MetricCard
          title="Recent Shipments"
          value={recentShipmentsCount.toString()}
          description="Last 7 days"
          icon={<ShipmentIcon />}
        />
        <MetricCard
          title="Waste This Month"
          value="8.2%"
          change="-2.1% from last month"
          changeColor="green"
          icon={<ChartIcon />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Stock Utilization & Waste" />
        <ChartCard title="Waste by Category" />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ItemsExpiringSoon items={itemsExpiringSoon} />
        <RecentShipments shipments={recentShipments} />
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
          <div key={item.stockItemId} className="flex items-center justify-between border-b pb-4 last:border-0">
            <div>
              <div className="font-medium text-gray-800">{item.productName}</div>
              <div className="text-sm text-gray-500">Batch: {item.batchNumber}</div>
            </div>
            <div className="text-right">
              <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                item.daysToExpiry <= 1 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {item.daysToExpiry} {item.daysToExpiry === 1 ? 'day' : 'days'}
              </div>
              <div className="text-xs text-gray-500 mt-1">{item.expiryDate}</div>
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
          <div key={shipment.shipmentId} className="flex items-center justify-between border-b pb-4 last:border-0">
            <div>
              <div className="font-medium text-gray-800">{shipment.shipmentId}</div>
              <div className="text-sm text-gray-500">{shipment.supplier}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">{shipment.itemCount} items</div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs mt-1 ${
                shipment.status === 'Processed' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {shipment.status}
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

