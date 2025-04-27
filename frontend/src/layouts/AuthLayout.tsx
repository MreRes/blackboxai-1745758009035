import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Finance Portal
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your finances with ease
            </p>
          </div>
          <Outlet />
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0">
          <div className="h-full w-full bg-gradient-to-br from-primary-600 to-primary-800" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-3xl font-bold">Welcome to Finance Portal</h2>
              <p className="mt-4 max-w-md text-lg">
                Track your expenses, manage budgets, and achieve your financial goals
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
