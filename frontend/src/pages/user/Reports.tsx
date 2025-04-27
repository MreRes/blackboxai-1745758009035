import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Mock data for initial development
const mockData = {
  monthlyTotals: [
    { month: '2023-05', income: 5000, expenses: 3500 },
    { month: '2023-06', income: 5200, expenses: 3800 },
    { month: '2023-07', income: 5100, expenses: 3600 },
    { month: '2023-08', income: 5300, expenses: 3900 },
    { month: '2023-09', income: 5400, expenses: 3700 },
    { month: '2023-10', income: 5500, expenses: 3800 },
  ],
  categoryBreakdown: [
    { category: 'Food', amount: 1200 },
    { category: 'Rent', amount: 1500 },
    { category: 'Transportation', amount: 400 },
    { category: 'Entertainment', amount: 300 },
    { category: 'Utilities', amount: 400 },
  ],
};

const monthlyChart = {
  labels: mockData.monthlyTotals.map((data) =>
    format(new Date(data.month), 'MMM yyyy')
  ),
  datasets: [
    {
      label: 'Income',
      data: mockData.monthlyTotals.map((data) => data.income),
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.5)',
      tension: 0.4,
    },
    {
      label: 'Expenses',
      data: mockData.monthlyTotals.map((data) => data.expenses),
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.5)',
      tension: 0.4,
    },
  ],
};

const categoryChart = {
  labels: mockData.categoryBreakdown.map((data) => data.category),
  datasets: [
    {
      data: mockData.categoryBreakdown.map((data) => data.amount),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(168, 85, 247, 0.8)',
      ],
    },
  ],
};

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: false,
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
};

export default function Reports() {
  const [dateRange, setDateRange] = useState('6M');

  // TODO: Replace with actual API calls
  const { data: reports } = useQuery(['reports', dateRange], () =>
    Promise.resolve(mockData)
  );

  const totalIncome = mockData.monthlyTotals.reduce(
    (sum, month) => sum + month.income,
    0
  );
  const totalExpenses = mockData.monthlyTotals.reduce(
    (sum, month) => sum + month.expenses,
    0
  );
  const savings = totalIncome - totalExpenses;
  const savingsRate = ((savings / totalIncome) * 100).toFixed(1);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Financial Reports
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            View your financial analytics and trends
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm sm:leading-6"
          >
            <option value="1M">Last Month</option>
            <option value="3M">Last 3 Months</option>
            <option value="6M">Last 6 Months</option>
            <option value="1Y">Last Year</option>
          </select>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">
            Total Income
          </dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {totalIncome.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            })}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">
            Total Expenses
          </dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {totalExpenses.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
            })}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">
            Savings Rate
          </dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {savingsRate}%
          </dd>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Income vs Expenses
          </h3>
          <div className="mt-6 h-80">
            <Line options={chartOptions} data={monthlyChart} />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Expense Breakdown
          </h3>
          <div className="mt-6 h-80">
            <Doughnut options={doughnutOptions} data={categoryChart} />
          </div>
        </div>
      </div>
    </div>
  );
}
