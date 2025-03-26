import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyRides, startRide, completeRide, clearError } from '../../redux/slices/rideSlice';
import { toast } from 'react-toastify';

const ManageRides = () => {
  const dispatch = useDispatch();
  const { myRides, isLoading, error } = useSelector((state) => state.rides);

  useEffect(() => {
    dispatch(fetchMyRides());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleStartRide = (rideId) => {
    // Find the ride that's being started
    const ride = myRides.find(r => r._id === rideId);
    
    // Check if the ride has any passengers
    if (!ride.passengers || ride.passengers.length === 0) {
      toast.error('Cannot start ride without any passengers');
      return;
    }

    // Check if current time is before starting time
    const currentTime = new Date();
    const startTime = new Date(ride.startingTime);
    
    if (currentTime < startTime) {
      const timeLeft = Math.ceil((startTime - currentTime) / (1000 * 60)); // Time left in minutes
      toast.error(`Cannot start ride before scheduled time. Please wait ${timeLeft} minutes.`);
      return;
    }

    dispatch(startRide(rideId))
      .unwrap()
      .then(() => {
        toast.success('Ride started successfully');
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  const handleCompleteRide = (rideId) => {
    dispatch(completeRide(rideId))
      .unwrap()
      .then(() => {
        toast.success('Ride completed successfully');
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'started':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const formatPaymentTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
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
      <h2 className="text-2xl font-bold mb-6">Manage Your Rides</h2>
      <div className="grid grid-cols-1 gap-6">
        {myRides.map((ride) => (
          <div key={ride._id} className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{ride.origin} → {ride.destination}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    Scheduled Start: {formatDateTime(ride.startingTime)}
                  </p>
                  {ride.actualStartTime && (
                    <>
                      <p className="text-sm text-gray-600">
                        Actual Start: {formatDateTime(ride.actualStartTime)}
                      </p>
                      {ride.delayInMinutes > 0 && (
                        <p className="text-sm text-yellow-600">
                          Delayed by: {ride.delayInMinutes} minutes
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-sm text-gray-600">
                    {ride.status === 'started' ? 'Updated Expected End' : 'Expected End'}: {formatDateTime(ride.expectedTime)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Available Seats: {ride.availableSeats}
                  </p>
                  <p className="text-sm text-gray-600">
                    Price per Seat: ₹{ride.pricePerSeat}
                  </p>
                </div>
              </div>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(ride.status)}`}>
                  {ride.status}
                </span>
              </div>
            </div>

            {ride.passengers && ride.passengers.length > 0 && (
              <div className="border-t pt-4 mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Passengers & Payments</h4>
                <div className="space-y-3">
                  {ride.passengers.map((passenger) => {
                    const paymentInfo = ride.passengerPayments?.find(
                      payment => payment.passenger?.id === passenger._id
                    );
                    
                    return (
                      <div key={passenger._id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">{passenger.name}</p>
                            <p className="text-xs text-gray-500">{passenger.email}</p>
                            <p className="text-xs text-gray-500">{passenger.phoneNumber}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              getPaymentStatusColor(paymentInfo?.paymentStatus || 'pending')
                            }`}>
                              {paymentInfo?.paymentStatus === 'completed' ? 'Paid' : 'Payment Pending'}
                            </span>
                            {paymentInfo?.paymentStatus === 'completed' && (
                              <div className="mt-1">
                                <p className="text-xs text-gray-500">
                                  Paid: ₹{paymentInfo.paidAmount || ride.pricePerSeat}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatPaymentTime(paymentInfo.paidAt)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  ID: {paymentInfo.paymentId}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {ride.status === 'completed' && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p>Total Expected:</p>
                      <p className="text-right">₹{ride.totalEarnings}</p>
                      <p>Total Received:</p>
                      <p className="text-right">₹{ride.receivedPayments}</p>
                      <p>Pending Amount:</p>
                      <p className="text-right">₹{ride.totalEarnings - ride.receivedPayments}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-4">
              {ride.status === 'available' && (
                <button
                  onClick={() => handleStartRide(ride._id)}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Start Ride
                </button>
              )}
              {ride.status === 'started' && (
                <button
                  onClick={() => handleCompleteRide(ride._id)}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Complete Ride
                </button>
              )}
            </div>
          </div>
        ))}
        {myRides.length === 0 && (
          <div className="text-center py-8 bg-white shadow-md rounded-lg">
            <p className="text-gray-500">You haven't created any rides yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageRides; 