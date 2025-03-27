import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { submitRating } from '../../redux/slices/rideSlice';
import { toast } from 'react-toastify';

const RatingFeedback = ({ ride }) => {
    const dispatch = useDispatch();
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(ride.userRating ? true : false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        try {
            await dispatch(submitRating({
                rideId: ride._id,
                rating,
                feedback
            })).unwrap();
            
            toast.success('Thank you for your feedback!');
            setHasSubmitted(true);
        } catch (error) {
            toast.error(error || 'Failed to submit rating');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (hasSubmitted) {
        return (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                    <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                                key={star}
                                className={`w-5 h-5 ${star <= ride.userRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        ))}
                    </div>
                </div>
                <p className="text-center text-gray-600">{ride.userFeedback || 'Thank you for rating!'}</p>
            </div>
        );
    }

    return (
        <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Rate Your Ride</h3>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating
                    </label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="focus:outline-none"
                            >
                                <svg
                                    className={`w-8 h-8 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} 
                                    hover:text-yellow-400 transition-colors`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Feedback (Optional)
                    </label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                        placeholder="Share your experience..."
                    ></textarea>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || rating === 0}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 
                    disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
            </form>
        </div>
    );
};

export default RatingFeedback; 