import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyBookings, clearError, cancelRide } from '../../redux/slices/rideSlice';
import { toast } from 'react-toastify';

const MyBookings = () => {
  const dispatch = useDispatch();
  const { myBookings, isLoading, error } = useSelector((state) => state.rides);
  const [filter, setFilter] = useState('all'); // all, upcoming, completed, cancelled

  useEffect(() => {
    dispatch(fetchMyBookings());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const getFilteredBookings = () => {
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        return myBookings.filter(booking => new Date(booking.startingTime) > now);
      case 'completed':
        return myBookings.filter(booking => booking.status === 'completed');
      case 'cancelled':
        return myBookings.filter(booking => booking.status === 'cancelled');
      default:
        return myBookings;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCancelRide = (rideId) => {
    dispatch(cancelRide(rideId))
        .unwrap()
        .then(() => {
            toast.success('Ride cancelled successfully');
        })
        .catch((error) => {
            toast.error(error.message);
        });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Bookings</h2>
        <div className="flex space-x-2">
          {['all', 'upcoming', 'completed', 'cancelled'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-md ${
                filter === filterOption
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {getFilteredBookings().map((booking) => (
          <div key={booking._id} className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">
                  {booking.origin} → {booking.destination}
                </h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    Start: {new Date(booking.startingTime).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Expected End: {new Date(booking.expectedTime).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Price per Seat: ₹{booking.pricePerSeat}
                  </p>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700">Driver Details:</p>
                  <p className="text-sm text-gray-600">{booking.rider?.name}</p>
                  <p className="text-sm text-gray-600">{booking.rider?.email}</p>
                  <p className="text-sm text-gray-600">{booking.rider?.phoneNumber}</p>
                </div>
              </div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {booking.status}
                </span>
              </div>
            </div>
            {booking.status !== 'completed' && booking.status !== 'cancelled' && (
              <button
                onClick={() => handleCancelRide(booking._id)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                disabled={isLoading}
              >
                Cancel Ride
              </button>
            )}
          </div>
        ))}
        {myBookings.length === 0 && (
          <div className="text-center py-8 bg-white shadow-md rounded-lg">
            <p className="text-gray-500">You haven't booked any rides yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings; 