import React, { useState } from 'react';
import { toast } from 'react-toastify';

const RideRating = ({ rideId, onRatingSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleStarClick = async (selectedRating) => {
        setRating(selectedRating);
        
        // If there's no feedback, submit the rating immediately
        if (!feedback) {
            handleSubmitRating(selectedRating, '');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        handleSubmitRating(rating, feedback);
    };

    const handleSubmitRating = async (ratingValue, feedbackText) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Call the callback provided by parent component
            await onRatingSubmitted({
                rideId,
                rating: ratingValue,
                feedback: feedbackText
            });
            
            // Reset form only on success
            setRating(0);
            setFeedback('');
        } catch (error) {
            // Error will be handled by the parent component
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="mb-4">
                <div className="flex space-x-2 justify-center mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => handleStarClick(star)}
                            className={`text-3xl focus:outline-none transform transition-transform hover:scale-110 ${
                                star <= rating ? 'text-yellow-400' : 'text-gray-300'
                            } hover:text-yellow-400`}
                        >
                            ★
                        </button>
                    ))}
                </div>
                {rating > 0 && (
                    <p className="text-center text-sm text-gray-600">
                        {rating === 5 ? 'Excellent!' :
                         rating === 4 ? 'Very Good!' :
                         rating === 3 ? 'Good' :
                         rating === 2 ? 'Fair' :
                         'Poor'}
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows="3"
                        placeholder="Tell us about your experience (optional)"
                    />
                </div>

                {feedback && (
                    <button
                        type="submit"
                        className={`w-full py-2 px-4 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors ${
                            isSubmitting ? 'opacity-75' : ''
                        }`}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                )}
            </form>
        </div>
    );
};

export default RideRating; 