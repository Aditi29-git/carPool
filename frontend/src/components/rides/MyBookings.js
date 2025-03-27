import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyBookings, clearError, cancelRide, submitRating } from '../../redux/slices/rideSlice';
import { toast } from 'react-toastify';
import RidePayment from './RidePayment';
import RatingFeedback from './RatingFeedback';
import RideRating from './RideRating';

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
  const { user: currentUser } = useSelector((state) => state.auth);
  const [filter, setFilter] = useState('all');
  const [bookings, setBookings] = useState([]);

  // Add state to track which bookings can still be cancelled
  const [cancellableBookings, setCancellableBookings] = useState(new Set());

  useEffect(() => {
    // Debug log for currentUser
    console.log('Current user state:', currentUser);
    dispatch(fetchMyBookings());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    setBookings(myBookings);
  }, [myBookings]);

  // Initialize cancellableBookings when bookings changes
  useEffect(() => {
    const newCancellableBookings = new Set(
        bookings
            .filter(booking => canCancelRide(booking))
            .map(booking => booking._id)
    );
    setCancellableBookings(newCancellableBookings);
  }, [bookings]);

  const getFilteredBookings = () => {
    const now = new Date();
    let filteredBookings;
    
    switch (filter) {
      case 'upcoming':
        filteredBookings = bookings.filter(booking => 
          new Date(booking.startingTime) > now && 
          booking.status !== 'completed' && 
          booking.status !== 'cancelled' &&
          booking.displayStatus !== 'Cancelled'
        );
        break;
      case 'completed':
        filteredBookings = bookings.filter(booking => 
          booking.status === 'completed'
        );
        break;
      case 'cancelled':
        // Look for cancelled status in either field
        filteredBookings = bookings.filter(booking => 
          booking.status === 'cancelled' || 
          booking.displayStatus === 'Cancelled'
        );
        break;
      default:
        // 'all' case or any other filter - show all bookings
        filteredBookings = bookings;
    }
    
    return filteredBookings;
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
      .then((response) => {
        toast.success('Ride cancelled successfully');
        
        // Update cancellable bookings set
        setCancellableBookings(prev => {
          const newSet = new Set(prev);
          newSet.delete(rideId);
          return newSet;
        });
        
        // Set filter to 'cancelled' to show the cancelled ride immediately
        setFilter('cancelled');
      })
      .catch((error) => {
        toast.error(error.message || 'Failed to cancel ride');
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

  const handleRatingSubmitted = async (ratingData) => {
    try {
      // Check if rating exists already
      const booking = myBookings.find(b => b._id === ratingData.rideId);
      if (booking && booking.userRating) {
        toast.warning('You have already submitted a rating for this ride');
        return;
      }

      const result = await dispatch(submitRating({
        rideId: ratingData.rideId,
        rating: ratingData.rating,
        feedback: ratingData.feedback
      })).unwrap();
      
      toast.success('Thank you for your feedback!');
      
      // No need to fetch bookings again as Redux will update the state
    } catch (error) {
      toast.error(error || 'Failed to submit rating');
    }
  };

  const canRate = (booking) => {
    if (!currentUser?._id || !booking || !booking.passengers) {
      return false;
    }

    // Check if the ride is completed
    if (booking.status !== 'completed') {
      return false;
    }
    
    // Check if the current user is a passenger in this ride
    const isPassenger = booking.passengers.some(passenger => {
      const passengerId = passenger._id || passenger;
      return passengerId.toString() === currentUser._id.toString();
    });

    if (!isPassenger) {
      return false;
    }
    
    // Check if the user has already rated
    return !booking.userRating;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const filteredBookings = getFilteredBookings();
  
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
        {filteredBookings.map((booking) => (
          <div key={booking._id} className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{booking.origin} → {booking.destination}</h3>
                <div className="mt-2 space-y-1">
                  {booking.status === 'started' ? (
                    <>
                      <p className="text-sm text-gray-600">
                        Original Schedule: {formatDateTime(booking.startingTime)}
                      </p>
                      <p className="text-sm text-gray-600 font-medium text-blue-600">
                        Started At: {formatDateTime(booking.actualStartTime)}
                      </p>
                      <p className="text-sm text-gray-600">
                        New Expected Arrival: {formatDateTime(booking.expectedTime)}
                      </p>
                    </>
                  ) : booking.status === 'completed' ? (
                    <>
                      <p className="text-sm text-gray-600">
                        Original Schedule: {formatDateTime(booking.startingTime)}
                      </p>
                      {booking.actualStartTime && (
                        <p className="text-sm text-gray-600">
                          Started At: {formatDateTime(booking.actualStartTime)}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Completed At: {formatDateTime(booking.actualEndTime)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Scheduled Start: {formatDateTime(booking.startingTime)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expected End: {formatDateTime(booking.expectedTime)}
                      </p>
                    </>
                  )}
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

            {/* Rating and Feedback Section - Show for completed rides */}
            {booking.status === 'completed' && (
              <div className="mt-6 border-t pt-4">
                {booking.userRating ? (
                  // Show submitted rating and feedback
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-medium mb-2">Your Rating</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-2xl ${
                                star <= booking.userRating ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          Submitted on {new Date(booking.ratingSubmittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {booking.userFeedback && (
                      <div>
                        <h4 className="text-lg font-medium mb-2">Your Feedback</h4>
                        <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {booking.userFeedback}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Show rating form for completed rides without rating
                  <div>
                    <h4 className="text-lg font-medium mb-4">Rate this ride</h4>
                    <RideRating
                      rideId={booking._id}
                      onRatingSubmitted={handleRatingSubmitted}
                    />
                  </div>
                )}

                {/* Show overall rating if exists */}
                {booking.averageRating && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-lg font-medium mb-2">Overall Rating</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-2xl ${
                              star <= booking.averageRating ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        ({booking.totalRatings} {booking.totalRatings === 1 ? 'rating' : 'ratings'})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filteredBookings.length === 0 && (
          <div className="text-center py-8 bg-white shadow-md rounded-lg">
            <p className="text-gray-500">
              {filter === 'cancelled'
                ? "No cancelled rides found."
                : filter === 'completed'
                ? "No completed rides found."
                : filter === 'upcoming'
                ? "No upcoming rides found."
                : "No bookings found."}
            </p>
            {filter === 'cancelled' && bookings.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                Try refreshing the page if you've just cancelled a ride.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings; 