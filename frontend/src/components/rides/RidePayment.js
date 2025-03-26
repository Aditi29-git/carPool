import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { makePayment } from '../../utils/payment';
import { useDispatch } from 'react-redux';
import { updatePaymentStatus, fetchMyBookings } from '../../redux/slices/rideSlice';

const RidePayment = ({ ride }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPaymentCompleted, setIsPaymentCompleted] = useState(ride.paymentStatus === 'completed');
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const updatePaymentStatusRedux = async (paymentId) => {
        try {
            await dispatch(updatePaymentStatus({ 
                rideId: ride._id, 
                paymentDetails: {
                    paymentId: 'PAY_' + Math.random().toString(36).substr(2, 9),
                    paidAmount: ride.pricePerSeat,
                    paidAt: new Date().toISOString(),
                    paymentStatus: 'completed'
                }
            })).unwrap();

            await dispatch(fetchMyBookings());
            
            setIsPaymentCompleted(true);
            return true;
        } catch (error) {
            console.error('Error updating payment status:', error);
            toast.error('Error updating payment status. Please contact support.');
            return false;
        }
    };

    const handlePayment = async () => {
        try {
            setIsProcessing(true);
            
            const totalAmount = ride.pricePerSeat * (ride.passengers?.length || 1);
            console.log('Total amount:', totalAmount);

            const userDetails = {
                name: ride.passengers?.[0]?.name || '',
                email: ride.passengers?.[0]?.email || '',
                phoneNumber: ride.passengers?.[0]?.phoneNumber || ''
            };

            await makePayment(totalAmount, ride._id, userDetails, async (paymentId) => {
                const updated = await updatePaymentStatusRedux(paymentId);
                if (updated) {
                    toast.success('Payment completed successfully!');
                    setTimeout(() => {
                        navigate('/dashboard');
                    }, 1500);
                }
            });
        } catch (error) {
            console.error('Payment error:', error);
            toast.error(error.message || 'Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Early return if ride data is invalid
    if (!ride || !ride._id) {
        return (
            <div className="mt-4">
                <span className="inline-flex items-center px-4 py-2 rounded-md bg-red-100 text-red-800">
                    Invalid ride data
                </span>
            </div>
        );
    }

    // Show payment completed status
    if (isPaymentCompleted || ride.paymentStatus === 'completed') {
        return (
            <div className="mt-4">
                <div className="flex items-center justify-center space-x-2 bg-green-100 text-green-800 px-4 py-3 rounded-md">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Payment Completed</span>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-4">
            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-3">Payment Details</h3>
                <div className="space-y-2">
                    <p className="text-sm text-gray-600">Price per seat: ₹{ride.pricePerSeat}</p>
                    <p className="text-sm text-gray-600">Number of seats: {ride.passengers?.length || 1}</p>
                    <p className="font-medium text-lg mt-3 border-t pt-2">
                        Total Amount: ₹{ride.pricePerSeat * (ride.passengers?.length || 1)}
                    </p>
                </div>
            </div>
            <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium transition-colors duration-200"
            >
                {isProcessing ? (
                    <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing Payment...
                    </span>
                ) : 'Pay Now'}
            </button>
            <p className="mt-2 text-sm text-gray-500 text-center">
                Secure payment powered by Razorpay
            </p>
        </div>
    );
};

export default RidePayment; 