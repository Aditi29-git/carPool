import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createRide, clearError } from '../../redux/slices/rideSlice';
import { toast } from 'react-toastify';

const CreateRide = () => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.rides);
  const [rideData, setRideData] = useState({
    origin: '',
    destination: '',
    date: '',
    startingTime: '',
    expectedTime: '',
    availableSeats: 1,
    pricePerSeat: ''
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Combine date and time for startingTime
    const startDate = new Date(rideData.date);
    const [startHours, startMinutes] = rideData.startingTime.split(':');
    startDate.setHours(parseInt(startHours), parseInt(startMinutes));

    // Create the ride data with the combined datetime
    const rideDataToSubmit = {
      ...rideData,
      startingTime: startDate.toISOString(),
      expectedTime: rideData.expectedTime
    };

    dispatch(createRide(rideDataToSubmit))
      .unwrap()
      .then(() => {
        toast.success('Ride created successfully');
        setRideData({
          origin: '',
          destination: '',
          date: '',
          startingTime: '',
          expectedTime: '',
          availableSeats: 1,
          pricePerSeat: ''
        });
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRideData(prev => ({
      ...prev,
      [name]: name === 'availableSeats' || name === 'pricePerSeat' ? parseInt(value) : value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Create a New Ride</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-1">
                Origin
              </label>
              <input
                type="text"
                id="origin"
                name="origin"
                value={rideData.origin}
                onChange={handleChange}
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
                name="destination"
                value={rideData.destination}
                onChange={handleChange}
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
                name="date"
                value={rideData.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="startingTime" className="block text-sm font-medium text-gray-700 mb-1">
                Starting Time
              </label>
              <input
                type="time"
                id="startingTime"
                name="startingTime"
                value={rideData.startingTime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="expectedTime" className="block text-sm font-medium text-gray-700 mb-1">
                Expected End Time
              </label>
              <input
                type="datetime-local"
                id="expectedTime"
                name="expectedTime"
                value={rideData.expectedTime}
                onChange={handleChange}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="availableSeats" className="block text-sm font-medium text-gray-700 mb-1">
                Available Seats
              </label>
              <input
                type="number"
                id="availableSeats"
                name="availableSeats"
                min="1"
                value={rideData.availableSeats}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="pricePerSeat" className="block text-sm font-medium text-gray-700 mb-1">
                Price per Seat (₹)
              </label>
              <input
                type="number"
                id="pricePerSeat"
                name="pricePerSeat"
                min="0"
                value={rideData.pricePerSeat}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Ride'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRide; 