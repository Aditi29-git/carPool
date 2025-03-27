import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import CreateRide from './rides/CreateRide';
import SearchRides from './rides/SearchRides';
import ManageRides from './rides/ManageRides';
import MyBookings from './rides/MyBookings';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState(user?.role === 'rider' ? 'manage' : 'search');

  const renderRiderDashboard = () => (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('manage')}
            className={`${
              activeTab === 'manage'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Manage Rides
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`${
              activeTab === 'create'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Create Ride
          </button>
        </nav>
      </div>

      {activeTab === 'manage' && <ManageRides />}
      {activeTab === 'create' && <CreateRide />}
    </div>
  );

  const renderUserDashboard = () => (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('search')}
            className={`${
              activeTab === 'search'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Search Rides
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`${
              activeTab === 'bookings'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            My Bookings
          </button>
        </nav>
      </div>

      {activeTab === 'search' && <SearchRides />}
      {activeTab === 'bookings' && <MyBookings />}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {user?.role === 'rider' ? renderRiderDashboard() : renderUserDashboard()}
    </div>
  );
};

export default Dashboard; 