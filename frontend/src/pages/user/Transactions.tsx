import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

// Mock data for initial development
const mockData = {
  transactions: [
    {
      id: '1',
      type: 'INCOME',
      amount: 5000,
      category: 'Salary',
      description: 'Monthly salary',
      date: '2023-10-01',
      source: 'manual',
    },
    {
      id: '2',
      type: 'EXPENSE',
      amount: -1200,
      category: 'Rent',
      description: 'Monthly rent',
      date: '2023-10-02',
      source: 'manual',
    },
  ],
  categories: ['Salary', 'Rent', 'Food', 'Transportation', 'Entertainment'],
};

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'EXPENSE',
    amount: '',
    category: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  // TODO: Replace with actual API calls
  const { data: transactions } = useQuery(['transactions'], () =>
    Promise.resolve(mockData.transactions)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement transaction creation/update
    setShowForm(false);
    setEditingId(null);
    setFormData({
      type: 'EXPENSE',
      amount: '',
      category: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleEdit = (transaction: typeof mockData.transactions[0]) => {
    setEditingId(transaction.id);
    setFormData({
      type: transaction.type,
      amount: Math.abs(transaction.amount).toString(),
      category: transaction.category,
      description: transaction.description || '',
      date: transaction.date,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    // TODO: Implement transaction deletion
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Transactions
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your income and expenses
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="block rounded-md bg-primary-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            Add Transaction
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mt-8">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-base font-semibold leading-6 text-gray-900">
              {editingId ? 'Edit Transaction' : 'New Transaction'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
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
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
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

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Category
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Description
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
                    >
                      Amount
                    </th>
                    <th
                      scope="col"
                      className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                    >
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {transactions?.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {transaction.category}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {transaction.description}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-4 text-sm text-right ${
                          transaction.amount > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {transaction.amount.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        })}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-x-4">
                          <button
                            type="button"
                            onClick={() => handleEdit(transaction)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                            <span className="sr-only">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(transaction.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                            <span className="sr-only">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
