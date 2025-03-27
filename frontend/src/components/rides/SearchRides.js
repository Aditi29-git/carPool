import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAvailableRides, bookRide, clearError } from '../../redux/slices/rideSlice';
import { toast } from 'react-toastify';

const SearchRides = () => {
  const dispatch = useDispatch();
  const { availableRides, isLoading, error } = useSelector((state) => state.rides);
  const [searchParams, setSearchParams] = useState({
    origin: '',
    destination: '',
    date: '',
    // time: '',
    seats: 1
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(fetchAvailableRides(searchParams));
  };

  const handleBookRide = (rideId) => {
    dispatch(bookRide({ 
      rideId, 
      seatsToBook: searchParams.seats
    }))
      .unwrap()
      .then(() => {
        toast.success('Ride booked successfully');
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  const formatDateTime = (dateString, startingTime) => {
    if (!dateString || !startingTime) return 'Not specified';
    const startDate = new Date(startingTime);
    return startDate.toLocaleString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">Search Rides</h2>
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-1">
              Origin
            </label>
            <input
              type="text"
              id="origin"
              value={searchParams.origin}
              onChange={(e) => setSearchParams({ ...searchParams, origin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
              Destination
            </label>
            <input
              type="text"
              id="destination"
              value={searchParams.destination}
              onChange={(e) => setSearchParams({ ...searchParams, destination: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="date"
              value={searchParams.date}
              onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          {/* <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              type="time"
              id="time"
              value={searchParams.time}
              onChange={(e) => setSearchParams({ ...searchParams, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div> */}
          <div>
            <label htmlFor="seats" className="block text-sm font-medium text-gray-700 mb-1">
              Seats
            </label>
            <input
              type="number"
              id="seats"
              min="1"
              value={searchParams.seats}
              onChange={(e) => setSearchParams({ ...searchParams, seats: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="md:col-span-2 lg:col-span-5 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {availableRides && availableRides.length > 0 ? (
            availableRides.map((ride) => (
              <div key={ride._id} className="bg-white shadow-md rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{ride.origin} → {ride.destination}</h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">
                        Start: {formatDateTime(ride.date, ride.startingTime)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expected End: {new Date(ride.expectedTime).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Available Seats: {ride.availableSeats}
                      </p>
                      <p className="text-sm text-gray-600">
                        Price per Seat: ₹{ride.pricePerSeat}
                      </p>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700">Driver Details:</p>
                      <p className="text-sm text-gray-600">{ride.rider?.name}</p>
                      <p className="text-sm text-gray-600">{ride.rider?.email}</p>
                      <div className="mt-2 flex items-center">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-lg ${
                                star <= Math.round(ride.riderRating) ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-gray-600">
                          {ride.riderRating ? (
                            <>
                              {ride.riderRating.toFixed(1)} ({ride.riderTotalRatings} {ride.riderTotalRatings === 1 ? 'rating' : 'ratings'})
                            </>
                          ) : (
                            'New driver'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleBookRide(ride._id)}
                    disabled={isLoading || ride.availableSeats < searchParams.seats}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Book Ride
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-white shadow-md rounded-lg">
              <p className="text-gray-500">No rides available for your search criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchRides; 