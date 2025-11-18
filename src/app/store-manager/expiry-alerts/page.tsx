'use client';

import { useState } from 'react';
import { expiryAlerts } from '@/data/staticData';
import { ExpiryAlert } from '@/types';

export default function ExpiryAlerts() {
  const [selectedPriority, setSelectedPriority] = useState<'Critical' | 'High Priority' | 'Medium Priority'>('Critical');

  const criticalAlerts = expiryAlerts.filter(a => a.priority === 'Critical');
  const highPriorityAlerts = expiryAlerts.filter(a => a.priority === 'High Priority');
  const mediumPriorityAlerts = expiryAlerts.filter(a => a.priority === 'Medium Priority');

  const getFilteredAlerts = () => {
    if (selectedPriority === 'Critical') return criticalAlerts;
    if (selectedPriority === 'High Priority') return highPriorityAlerts;
    return mediumPriorityAlerts;
  };

  const filteredAlerts = getFilteredAlerts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Expiry Alerts Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage upcoming expirations and apply promotional markdowns.</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Expiry Report</span>
          </button>
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Waste Report</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard title="Critical Alerts" value={criticalAlerts.length} description="Expiring within 24 hours" color="red" />
        <SummaryCard title="High Priority" value={highPriorityAlerts.length} description="Expiring within 2 days" color="orange" />
        <SummaryCard title="Medium Priority" value={mediumPriorityAlerts.length} description="Expiring within 7 days" color="yellow" />
        <SummaryCard title="Alert Threshold" value="7 days" description="Configurable setting" isInput={true} />
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <TabButton
          label={`Critical (${criticalAlerts.length})`}
          isActive={selectedPriority === 'Critical'}
          onClick={() => setSelectedPriority('Critical')}
        />
        <TabButton
          label={`High Priority (${highPriorityAlerts.length})`}
          isActive={selectedPriority === 'High Priority'}
          onClick={() => setSelectedPriority('High Priority')}
        />
        <TabButton
          label={`Medium Priority (${mediumPriorityAlerts.length})`}
          isActive={selectedPriority === 'Medium Priority'}
          onClick={() => setSelectedPriority('Medium Priority')}
        />
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAlerts.map((alert) => (
          <AlertCard key={alert.alertId} alert={alert} />
        ))}
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

function AlertCard({ alert }: { alert: ExpiryAlert }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      <div className="absolute top-4 right-4">
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <div className="flex space-x-2 mb-4">
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
          alert.priority === 'Critical' ? 'bg-red-100 text-red-700' :
          alert.priority === 'High Priority' ? 'bg-orange-100 text-orange-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {alert.priority}
        </span>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
          {alert.category}
        </span>
      </div>

      <h3 className="text-xl font-bold text-gray-800 mb-4">{alert.productName}</h3>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Batch:</span>
          <span className="text-gray-800 font-medium">{alert.batchNumber}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Quantity:</span>
          <span className="text-gray-800 font-medium">{alert.quantity} units</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Expiry Date:</span>
          <span className="text-gray-800 font-medium">{alert.expiryDate}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Days Left:</span>
          <span className="text-red-600 font-medium">{alert.daysUntilExpiry} day{alert.daysUntilExpiry !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Current Price:</span>
          <span className="text-gray-800 font-medium">${alert.currentPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Suggested Discount:</span>
          <span className="text-green-600 font-medium">{alert.suggestedDiscount}%</span>
        </div>
      </div>

      <div className="flex space-x-3">
        <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Apply Suggested Discount</span>
        </button>
        <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>View Details</span>
        </button>
      </div>
    </div>
  );
}

