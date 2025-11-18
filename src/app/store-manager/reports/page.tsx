'use client';

import { wasteReport } from '@/data/staticData';

export default function Reports() {
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
          title="Total Waste (Oct)"
          value={`${wasteReport.totalWaste}%`}
          subtitle={`${234} items wasted`}
          valueColor="red"
        />
        <MetricCard
          title="Waste Cost (Oct)"
          value={`$${wasteReport.wasteCost}`}
          subtitle="-39% from last month"
          subtitleColor="green"
        />
        <MetricCard
          title="Items Saved"
          value={wasteReport.itemsSaved.toString()}
          subtitle="Via discounts this month"
          valueColor="green"
        />
        <MetricCard
          title="Recovery Rate"
          value={`${wasteReport.recoveryRate}%`}
          subtitle="Items sold before expiry"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCardWithExport title="Waste Trend Over Time" />
        <ChartCardWithExport title="Waste by Category" />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCardWithExport title="Waste Cost Distribution" />
        <MostExpiredProducts />
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

function ChartCardWithExport({ title }: { title: string }) {
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
      <div className="h-64 flex items-center justify-center text-gray-400">
        Chart visualization would go here
      </div>
    </div>
  );
}

function MostExpiredProducts() {
  const products = [
    { name: 'Strawberries', category: 'Produce', count: 48 },
    { name: 'Organic Milk', category: 'Dairy', count: 35 },
    { name: 'Fresh Salmon', category: 'Meat', count: 28 },
    { name: 'Greek Yogurt', category: 'Dairy', count: 22 },
    { name: 'Whole Wheat Bread', category: 'Bakery', count: 18 },
  ];

  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-gray-500', 'bg-gray-400'];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Most Commonly Expired Products</h3>
        <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export</span>
        </button>
      </div>
      <div className="space-y-4">
        {products.map((product, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className={`w-10 h-10 ${colors[index]} rounded-full flex items-center justify-center text-white font-bold`}>
              {index + 1}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-800">{product.name}</div>
              <div className="text-sm text-gray-500">{product.category}</div>
            </div>
            <div className="text-lg font-semibold text-gray-800">{product.count} items expired</div>
          </div>
        ))}
      </div>
    </div>
  );
}

