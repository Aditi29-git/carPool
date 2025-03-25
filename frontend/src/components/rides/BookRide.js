import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { makePayment } from '../../utils/payment';
import { bookRide } from '../../redux/slices/rideSlice'; // Make sure this path is correct

const BookRide = ({ ride, user }) => {
    const dispatch = useDispatch();
    const [seatsToBook, setSeatsToBook] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleBooking = async () => {
        try {
            setIsProcessing(true);
            const amount = ride.pricePerSeat * seatsToBook;
            
            await makePayment(amount, ride._id, user, async (paymentId) => {
                try {
                    await dispatch(bookRide({ 
                        rideId: ride._id, 
                        seatsToBook,
                        paymentId 
                    })).unwrap();
                    
                    toast.success('Ride booked successfully');
                } catch (error) {
                    toast.error(error.message || 'Failed to book ride');
                    // You might want to handle payment rollback here
                }
            });
        } catch (error) {
            toast.error('Payment failed: ' + (error.message || 'Unknown error'));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-4 border rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Book Ride</h3>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                    Number of Seats
                </label>
                <input
                    type="number"
                    min="1"
                    max={ride.availableSeats}
                    value={seatsToBook}
                    onChange={(e) => setSeatsToBook(Math.min(Math.max(1, parseInt(e.target.value) || 1), ride.availableSeats))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
            </div>
            <div className="mb-4">
                <p className="text-sm text-gray-600">
                    Price per seat: ₹{ride.pricePerSeat}
                </p>
                <p className="text-lg font-semibold">
                    Total: ₹{ride.pricePerSeat * seatsToBook}
                </p>
            </div>
            <button
                onClick={handleBooking}
                disabled={isProcessing || seatsToBook < 1 || seatsToBook > ride.availableSeats}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {isProcessing ? 'Processing...' : 'Book Now'}
            </button>
        </div>
    );
};

export default BookRide;