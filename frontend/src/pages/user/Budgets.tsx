import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// Mock data for initial development
const mockData = {
  budgets: [
    {
      id: '1',
      category: 'Food',
      amount: 500,
      period: 'MONTHLY',
      startDate: '2023-10-01',
      endDate: '2023-10-31',
      spent: 320,
    },
    {
      id: '2',
      category: 'Transportation',
      amount: 200,
      period: 'MONTHLY',
      startDate: '2023-10-01',
      endDate: '2023-10-31',
      spent: 150,
    },
  ],
  categories: ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Utilities'],
  periods: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
};

export default function Budgets() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'MONTHLY',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
  });

  // TODO: Replace with actual API calls
  const { data: budgets } = useQuery(['budgets'], () =>
    Promise.resolve(mockData.budgets)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement budget creation/update
    setShowForm(false);
    setEditingId(null);
    setFormData({
      category: '',
      amount: '',
      period: 'MONTHLY',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
    });
  };

  const handleEdit = (budget: typeof mockData.budgets[0]) => {
    setEditingId(budget.id);
    setFormData({
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    // TODO: Implement budget deletion
  };

  const getProgressColor = (spent: number, amount: number) => {
    const percentage = (spent / amount) * 100;
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-600';
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Budgets
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your spending limits by category
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="block rounded-md bg-primary-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            Add Budget
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mt-8">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-base font-semibold leading-6 text-gray-900">
              {editingId ? 'Edit Budget' : 'New Budget'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                >
                  <option value="">Select a category</option>
                  {mockData.categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Period
                </label>
                <select
                  value={formData.period}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, period: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                >
                  {mockData.periods.map((period) => (
                    <option key={period} value={period}>
                      {period.charAt(0) + period.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {budgets?.map((budget) => (
          <div
            key={budget.id}
            className="relative overflow-hidden rounded-lg bg-white shadow"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {budget.category}
                </h3>
                <div className="flex gap-x-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(budget)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(budget.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-base font-medium text-gray-900">
                  <p>Spent</p>
                  <p>
                    {budget.spent.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    })}
                  </p>
                </div>
                <div className="mt-1 flex justify-between text-sm text-gray-500">
                  <p>Budget</p>
                  <p>
                    {budget.amount.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    })}
                  </p>
                </div>
                <div className="mt-4">
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(
                        budget.spent,
                        budget.amount
                      )}`}
                      style={{
                        width: `${Math.min(
                          (budget.spent / budget.amount) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <p>
                    {format(new Date(budget.startDate), 'MMM dd')} -{' '}
                    {format(new Date(budget.endDate), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
