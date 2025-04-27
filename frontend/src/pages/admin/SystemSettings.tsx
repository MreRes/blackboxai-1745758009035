import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CloudArrowDownIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';

const mockData = {
  settings: {
    activationCodeExpiry: 7,
    maxDevicesPerUser: 3,
    passwordMinLength: 8,
    backupFrequency: 24,
    lastBackup: '2023-10-05T10:00:00Z',
  },
};

export default function SystemSettings() {
  const [formData, setFormData] = useState(mockData.settings);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const { data: settings } = useQuery(['settings'], () =>
    Promise.resolve(mockData.settings)
  );

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement settings update
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    // TODO: Implement manual backup
    setTimeout(() => setIsBackingUp(false), 2000);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    // TODO: Implement database restore
    setTimeout(() => setIsRestoring(false), 2000);
  };

  return (
    <div className="space-y-10 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h2 className="text-base font-semibold leading-7 text-gray-900">
          System Settings
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          Manage system-wide settings and configurations
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
          <div className="col-span-full">
            <label
              htmlFor="passwordMinLength"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Minimum Password Length
            </label>
            <div className="mt-2">
              <input
                type="number"
                name="passwordMinLength"
                id="passwordMinLength"
                min={6}
                max={32}
                value={formData.passwordMinLength}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    passwordMinLength: parseInt(e.target.value, 10),
                  }))
                }
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Set the minimum required length for user passwords
            </p>
          </div>

          <div className="col-span-full">
            <label
              htmlFor="activationCodeExpiry"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Activation Code Expiry (days)
            </label>
            <div className="mt-2">
              <input
                type="number"
                name="activationCodeExpiry"
                id="activationCodeExpiry"
                min={1}
                max={30}
                value={formData.activationCodeExpiry}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    activationCodeExpiry: parseInt(e.target.value, 10),
                  }))
                }
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Number of days before activation codes expire
            </p>
          </div>

          <div className="col-span-full">
            <label
              htmlFor="maxDevicesPerUser"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Maximum Devices per User
            </label>
            <div className="mt-2">
              <input
                type="number"
                name="maxDevicesPerUser"
                id="maxDevicesPerUser"
                min={1}
                max={10}
                value={formData.maxDevicesPerUser}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxDevicesPerUser: parseInt(e.target.value, 10),
                  }))
                }
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Maximum number of devices allowed per user
            </p>
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            Save Settings
          </button>
        </div>
      </form>

      <div className="border-t border-gray-200 pt-10">
        <h3 className="text-base font-semibold leading-7 text-gray-900">
          Database Management
        </h3>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          Backup and restore database
        </p>

        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={handleBackupNow}
              disabled={isBackingUp}
              className="inline-flex items-center gap-x-2 rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              <CloudArrowDownIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
              {isBackingUp ? 'Backing up...' : 'Backup Now'}
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Last backup: {settings?.lastBackup ? new Date(settings.lastBackup).toLocaleString() : 'Never'}
            </p>
          </div>
          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={handleRestore}
              disabled={isRestoring}
              className="inline-flex items-center gap-x-2 rounded-md bg-yellow-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
            >
              <CloudArrowUpIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
              {isRestoring ? 'Restoring...' : 'Restore Database'}
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Restore database from backup
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
