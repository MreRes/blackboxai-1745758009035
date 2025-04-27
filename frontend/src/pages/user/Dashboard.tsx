import { useState } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// TODO: Replace with actual API calls
const mockData = {
  totalBalance: 25000,
  monthlyIncome: 8500,
  monthlyExpenses: 6200,
  monthlySavings: 2300,
  transactions: [
    { date: '2023-10-01', amount: 8500, type: 'INCOME' },
    { date: '2023-10-02', amount: -1200, type: 'EXPENSE' },
    { date: '2023-10-03', amount: -800, type: 'EXPENSE' },
    { date: '2023-10-04', amount: -2000, type: 'EXPENSE' },
    { date: '2023-10-05', amount: -1200, type: 'EXPENSE' },
    { date: '2023-10-06', amount: -1000, type: 'EXPENSE' },
  ],
};

const stats = [
  {
    name: 'Total Balance',
    value: mockData.totalBalance.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    }),
    icon: BanknotesIcon,
    change: '+4.75%',
    changeType: 'positive',
  },
  {
    name: 'Monthly Income',
    value: mockData.monthlyIncome.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    }),
    icon: ArrowTrendingUpIcon,
    change: '+10.18%',
    changeType: 'positive',
  },
  {
    name: 'Monthly Expenses',
    value: mockData.monthlyExpenses.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    }),
    icon: ArrowTrendingDownIcon,
    change: '-3.38%',
    changeType: 'negative',
  },
  {
    name: 'Monthly Savings',
    value: mockData.monthlySavings.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    }),
    icon: ChartBarIcon,
    change: '+2.45%',
    changeType: 'positive',
  },
];

const chartData = {
  labels: mockData.transactions.map((t) => format(new Date(t.date), 'MMM dd')),
  datasets: [
    {
      label: 'Balance',
      data: mockData.transactions.reduce(
        (acc: number[], curr) => {
          const last = acc[acc.length - 1];
          return [...acc, last + curr.amount];
        },
        [mockData.totalBalance - mockData.transactions.reduce((sum, t) => sum + t.amount, 0)]
      ),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      tension: 0.4,
    },
  ],
};

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: false,
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

export default function Dashboard() {
  // TODO: Replace with actual API calls
  const { data: transactions } = useQuery(['transactions'], () =>
    Promise.resolve(mockData.transactions)
  );

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
          >
            <dt>
              <div className="absolute rounded-md bg-primary-500 p-3">
                <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p
                className={classNames(
                  stat.changeType === 'positive'
                    ? 'text-green-600'
                    : 'text-red-600',
                  'ml-2 flex items-baseline text-sm font-semibold'
                )}
              >
                {stat.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Balance Overview
            </h3>
            <div className="mt-2 h-96">
              <Line options={chartOptions} data={chartData} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Recent Transactions
            </h3>
            <div className="mt-6 flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                        >
                          Date
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Type
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900"
                        >
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {transactions?.map((transaction) => (
                        <tr key={transaction.date}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                            {format(new Date(transaction.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {transaction.type}
                          </td>
                          <td
                            className={classNames(
                              'whitespace-nowrap px-3 py-4 text-right text-sm',
                              transaction.amount > 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            )}
                          >
                            {transaction.amount.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            })}
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
      </div>
    </div>
  );
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
