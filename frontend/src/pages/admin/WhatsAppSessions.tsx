import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  PhoneIcon,
  QrCodeIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// Mock data for initial development
const mockData = {
  sessions: [
    {
      id: '1',
      userId: 'user1',
      username: 'John Doe',
      phoneNumber: '+1234567890',
      isActive: true,
      lastActive: '2023-10-05T15:30:00Z',
      deviceInfo: 'iPhone 12',
    },
    {
      id: '2',
      userId: 'user2',
      username: 'Jane Smith',
      phoneNumber: '+1234567891',
      isActive: true,
      lastActive: '2023-10-05T14:45:00Z',
      deviceInfo: 'Samsung Galaxy S21',
    },
  ],
};

export default function WhatsAppSessions() {
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // TODO: Replace with actual API calls
  const { data: sessions } = useQuery(['whatsapp-sessions'], () =>
    Promise.resolve(mockData.sessions)
  );

  const handleGenerateQR = (userId: string) => {
    setSelectedUserId(userId);
    setShowQRCode(true);
    // TODO: Implement QR code generation
  };

  const handleTerminateSession = (sessionId: string) => {
    // TODO: Implement session termination
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            WhatsApp Sessions
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor and manage active WhatsApp sessions
          </p>
        </div>
      </div>

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
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Phone Number
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Device
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Last Active
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
                  {sessions?.map((session) => (
                    <tr key={session.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {session.username}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {session.phoneNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {session.deviceInfo}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            session.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {session.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {format(new Date(session.lastActive), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-x-4">
                          <button
                            type="button"
                            onClick={() => handleGenerateQR(session.userId)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <QrCodeIcon className="h-5 w-5" />
                            <span className="sr-only">Generate QR Code</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTerminateSession(session.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XMarkIcon className="h-5 w-5" />
                            <span className="sr-only">Terminate Session</span>
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

      {showQRCode && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                  <QrCodeIcon
                    className="h-6 w-6 text-primary-600"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">
                    Scan QR Code
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Open WhatsApp on your phone and scan this QR code to log in
                    </p>
                  </div>
                  <div className="mt-4 flex justify-center">
                    {/* TODO: Replace with actual QR code */}
                    <div className="h-64 w-64 bg-gray-200" />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  onClick={() => setShowQRCode(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
