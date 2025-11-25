'use client';

import { useMemo, useState } from 'react';
import { useProducts } from '@/hooks/useApiData';

export default function POSIntegration() {
  const [transactionsToday] = useState(287);
  const [itemsSoldToday] = useState(543);
  const [nearExpirySold] = useState(34);
  const [isSyncActive] = useState(true);
  const { data: products, loading, error, refresh } = useProducts();

  const transactionFeed = useMemo(() => {
    return products.map((product, index) => {
      const quantity = (index % 5) + 1;
      return {
        transactionId: `TXN-${5600 + index}`,
        transactionDate: `${9 + (index % 3)}:${20 + index} AM`,
        product: product.name,
        batch: `LOT-${product.productId ?? index}`.toUpperCase(),
        quantity,
        price: product.standardPrice * quantity,
        stockBefore: 100 - index * 2,
        stockAfter: 100 - index * 2 - quantity,
        cashier: index % 2 === 0 ? 'Mike Cashier' : 'Sarah Clerk',
      };
    });
  }, [products]);

  const displayTransactions = transactionFeed.slice(0, 5);
  const stockUpdates = transactionFeed.slice(0, 5).map((txn) => ({
    product: txn.product,
    batch: txn.batch,
    status: txn.quantity > 3 ? 'High Demand' : 'Steady',
    stockChange: -txn.quantity,
    currentStock: txn.stockAfter,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">POS Integration</h1>
          <p className="text-gray-600 mt-1">Real-time inventory updates synchronized with point of sale transactions.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isSyncActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-gray-700">Live Updates Active</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Transactions Today"
          value={transactionsToday.toString()}
          subtitle="Last updated: just now"
        />
        <MetricCard
          title="Items Sold Today"
          value={itemsSoldToday.toString()}
          subtitle="+12% from yesterday"
          subtitleColor="green"
        />
        <MetricCard
          title="Near-Expiry Sold"
          value={nearExpirySold.toString()}
          subtitle="With discounts applied"
          valueColor="orange"
        />
        <MetricCard
          title="Sync Status"
          value="Synchronized"
          subtitle="Last sync: 2 sec ago"
          icon={<SyncIcon />}
          iconColor="green"
        />
      </div>

      {/* Content Grid */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center justify-between text-sm">
          <span>Could not load product catalog.</span>
          <button onClick={refresh} className="underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
          </div>
          <div className="space-y-3">
            {loading && <p className="text-sm text-gray-500">Loading transactions...</p>}
            {!loading && displayTransactions.map((txn) => (
              <div key={txn.transactionId} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex items-center space-x-3">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-800">{txn.product}</div>
                    <div className="text-xs text-gray-500">Batch: {txn.batch}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Qty: {txn.quantity}</div>
                  <div className="text-sm font-medium text-gray-800">${txn.price.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Stock Updates */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-800">Real-time Stock Updates</h3>
          </div>
          <div className="space-y-3">
            {loading && <p className="text-sm text-gray-500">Waiting for stock updates...</p>}
            {!loading && stockUpdates.slice(0, 5).map((update, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div>
                  <div className="font-medium text-gray-800">{update.product}</div>
                  <div className="text-xs text-gray-500">Batch: {update.batch}</div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    update.status === 'Near Expiry' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {update.status}
                  </span>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${update.stockChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {update.stockChange > 0 ? '+' : ''}{update.stockChange}
                    </div>
                    <div className="text-xs text-gray-500">Stock: {update.currentStock}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction Details Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Transaction Details with Stock Changes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Before</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock After</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactionFeed.map((txn) => (
                <tr key={txn.transactionId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{txn.transactionId}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{txn.transactionDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{txn.product}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{txn.batch}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{txn.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{txn.stockBefore}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">{txn.stockAfter}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{txn.cashier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, subtitleColor = 'gray', valueColor = 'black', icon, iconColor = 'blue' }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      {icon && <div className="absolute top-6 right-6">{icon}</div>}
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className={`text-3xl font-bold mb-1 ${
        valueColor === 'orange' ? 'text-orange-600' : 
        valueColor === 'green' ? 'text-green-600' : 
        'text-gray-800'
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

function SyncIcon() {
  return (
    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

