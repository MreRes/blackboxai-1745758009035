import { UsersIcon, UserPlusIcon, ChartBarIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// Mock data for initial development
const mockData = {
  stats: [
    {
      name: 'Total Users',
      value: 150,
      icon: UsersIcon,
      change: '+12.5%',
      changeType: 'positive',
    },
    {
      name: 'Active Users',
      value: 125,
      icon: UserPlusIcon,
      change: '+15.2%',
      changeType: 'positive',
    },
    {
      name: 'New Users This Month',
      value: 15,
      icon: ChartBarIcon,
      change: '+8.1%',
      changeType: 'positive',
    },
    {
      name: 'Active WhatsApp Sessions',
      value: 98,
      icon: ChatBubbleLeftRightIcon,
      change: '+23.7%',
      changeType: 'positive',
    },
  ],
  recentActivations: [
    { id: 1, username: 'user1', date: '2023-10-01', status: 'active' },
    { id: 2, username: 'user2', date: '2023-10-02', status: 'pending' },
    { id: 3, username: 'user3', date: '2023-10-03', status: 'active' },
    { id: 4, username: 'user4', date: '2023-10-04', status: 'active' },
    { id: 5, username: 'user5', date: '2023-10-05', status: 'pending' },
  ],
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function AdminDashboard() {
  // TODO: Replace with actual API calls
  const { data: activations } = useQuery(['recent-activations'], () =>
    Promise.resolve(mockData.recentActivations)
  );

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {mockData.stats.map((stat) => (
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
              Recent Activations
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
                          Username
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Date
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {activations?.map((activation) => (
                        <tr key={activation.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                            {activation.username}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {format(new Date(activation.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={classNames(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                activation.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              )}
                            >
                              {activation.status}
                            </span>
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
