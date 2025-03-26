import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyBookings, clearError, cancelRide } from '../../redux/slices/rideSlice';
import { toast } from 'react-toastify';
import RidePayment from './RidePayment';

const CancelTimer = ({ bookingTime, onTimeExpired }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const bookingDate = new Date(bookingTime);
            const diffInMinutes = (now - bookingDate) / (1000 * 60);
            const timeLeftInMinutes = Math.max(0, 3 - diffInMinutes);
            setTimeLeft(timeLeftInMinutes);

            // Call onTimeExpired when time runs out
            if (timeLeftInMinutes <= 0) {
                onTimeExpired();
            }
        };

        // Calculate initial time
        calculateTimeLeft();

        // Update every second
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [bookingTime, onTimeExpired]);

    if (timeLeft <= 0) {
        return null;
    }

    const minutes = Math.floor(timeLeft);
    const seconds = Math.floor((timeLeft - minutes) * 60);

    return (
        <p className="mt-2 text-sm text-gray-500">
            Time left to cancel: {minutes}m {seconds}s
        </p>
    );
};

const MyBookings = () => {
  const dispatch = useDispatch();
  const { myBookings, isLoading, error } = useSelector((state) => state.rides);
  const [filter, setFilter] = useState('all'); // all, upcoming, completed, cancelled

  // Add state to track which bookings can still be cancelled
  const [cancellableBookings, setCancellableBookings] = useState(new Set());

  useEffect(() => {
    dispatch(fetchMyBookings());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Initialize cancellableBookings when myBookings changes
  useEffect(() => {
    const newCancellableBookings = new Set(
        myBookings
            .filter(booking => canCancelRide(booking))
            .map(booking => booking._id)
    );
    setCancellableBookings(newCancellableBookings);
  }, [myBookings]);

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

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return new Date(dateString).toLocaleString('en-US', options);
  };

  const canCancelRide = (booking) => {
    // Don't allow cancellation for completed or cancelled rides
    if (booking.status === 'completed' || booking.status === 'cancelled') {
        return false;
    }

    // Check if booking time exists
    if (!booking.bookingTime) {
        return false;
    }

    const currentTime = new Date();
    const bookingTime = new Date(booking.bookingTime);
    const timeDifferenceInMinutes = (currentTime - bookingTime) / (1000 * 60);

    // Allow cancellation within 3 minutes of booking
    return timeDifferenceInMinutes <= 3;
  };

  const getPaymentStatus = (booking) => {
    // Find the payment details for the current user
    const userPayment = booking.passengerPayments?.find(
      payment => payment.passenger._id === booking.passengers[0]._id
    );

    // Return the user's specific payment status
    return {
      status: userPayment?.paymentStatus || 'pending',
      details: userPayment
    };
  };

  const handleTimeExpired = (bookingId) => {
    setCancellableBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
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
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{booking.origin} → {booking.destination}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    Scheduled Start: {formatDateTime(booking.startingTime)}
                  </p>
                  {booking.actualStartTime && (
                    <>
                      <p className="text-sm text-gray-600">
                        Actual Start: {formatDateTime(booking.actualStartTime)}
                      </p>
                      {booking.delayInMinutes > 0 && (
                        <p className="text-sm text-yellow-600">
                          Delayed by: {booking.delayInMinutes} minutes
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-sm text-gray-600">
                    {booking.status === 'started' ? 'Updated Expected End' : 'Expected End'}: {formatDateTime(booking.expectedTime)}
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
                  booking.displayStatus === 'Upcoming' ? 'bg-blue-100 text-blue-800' :
                  booking.displayStatus === 'Waiting to Start' ? 'bg-yellow-100 text-yellow-800' :
                  booking.displayStatus === 'Started' ? 'bg-green-100 text-green-800' :
                  booking.displayStatus === 'Payment Pending' ? 'bg-red-100 text-red-800' :
                  booking.displayStatus === 'Payment Completed' ? 'bg-green-100 text-green-800' :
                  booking.displayStatus === 'Cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {booking.displayStatus}
                </span>
              </div>
            </div>
            
            {booking.status === 'completed' && !booking.paymentDetails?.paymentId && (
              <RidePayment ride={booking} />
            )}

            {cancellableBookings.has(booking._id) && (
              <div className="mt-4">
                <button
                  onClick={() => handleCancelRide(booking._id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                  disabled={isLoading}
                >
                  Cancel Ride
                </button>
                <CancelTimer 
                  bookingTime={booking.bookingTime} 
                  onTimeExpired={() => handleTimeExpired(booking._id)}
                />
              </div>
            )}

            {booking.paymentDetails?.paymentId && (
              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Details</h4>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    Amount Paid: ₹{booking.paymentDetails.paidAmount || booking.pricePerSeat}
                  </p>
                  <p className="text-sm text-gray-600">
                    Paid on: {formatDateTime(booking.paymentDetails.paidAt)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Payment ID: {booking.paymentDetails.paymentId}
                  </p>
                </div>
              </div>
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