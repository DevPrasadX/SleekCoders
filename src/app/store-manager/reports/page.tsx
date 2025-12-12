'use client';

import { useMemo, ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboardMetrics, useLots, useProducts, useSuppliers } from '@/hooks/useApiData';

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

  const supplierChartData = useMemo(() => {
    const map = new Map<number, number>();
    lots.forEach((lot) => {
      map.set(lot.SUPPLIER_ID, (map.get(lot.SUPPLIER_ID) ?? 0) + lot.LOT_QUANTITY);
    });
    return suppliers
      .map((supplier) => ({
        name: supplier.SUPPLIER_NAME,
        units: map.get(supplier.SUPPLIER_ID) ?? 0,
        skus: supplier.SUPPLIER_PRODUCT_COUNT,
      }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 6);
  }, [lots, suppliers]);

  const categoryChartData = useMemo(() => {
    const counts = products.reduce<Record<string, number>>((acc, product) => {
      acc[product.category] = (acc[product.category] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [products]);

  const inventoryHealthData = useMemo(() => {
    return [...lots]
      .sort((a, b) => b.LOT_QUANTITY - a.LOT_QUANTITY)
      .slice(0, 8)
      .map((lot) => ({
        name: lot.LOT_NAME,
        units: lot.LOT_QUANTITY,
        products: lot.LOT_PRODUCT_COUNT,
      }));
  }, [lots]);

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
        <ChartCard
          title="Supplier Coverage"
          description="Top suppliers ranked by units delivered"
          footer={`${metrics.totalUnits.toLocaleString()} total units`}
        >
          {supplierChartData.length === 0 ? (
            <ChartEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={supplierChartData} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#f9fafb' }}
                  formatter={(value: number) => [`${value} units`, 'Units']}
                />
                <Bar dataKey="units" radius={[6, 6, 0, 0]} fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <ChartCard
          title="Products by Category"
          description="SKU distribution across categories"
          footer={`${categoryChartData.reduce((sum, item) => sum + item.count, 0)} tracked SKUs`}
        >
          {categoryChartData.length === 0 ? (
            <ChartEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip formatter={(value: number) => [`${value} products`, 'Products']} />
                <Pie
                  data={categoryChartData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {categoryChartData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                  <LabelList dataKey="name" position="outside" offset={8} />
                </Pie>
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Lot Performance"
          description="Top lots by units and SKU coverage"
          footer="Helps prioritize replenishment"
        >
          {inventoryHealthData.length === 0 ? (
            <ChartEmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={inventoryHealthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name) =>
                    name === 'units' ? [`${value} units`, 'Units'] : [`${value} SKUs`, 'Products']
                  }
                />
                <Line
                  type="monotone"
                  dataKey="units"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="products"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
        <LowStockTable lots={lowInventoryLots} />
      </div>
    </div>
  );
}

const PIE_COLORS = ['#2563eb', '#16a34a', '#f97316', '#e11d48', '#7c3aed', '#0f766e'];

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

function ChartCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export</span>
        </button>
      </div>
      <div className="mt-6 min-h-[300px]">{children}</div>
      {footer && <p className="mt-4 text-xs text-gray-500">{footer}</p>}
    </div>
  );
}

function ChartEmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-sm text-gray-500">Data will appear as soon as new activity is recorded.</p>
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

