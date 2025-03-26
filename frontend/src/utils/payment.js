import { toast } from 'react-toastify';

export const initializeRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
            resolve(true);
        };
        script.onerror = () => {
            resolve(false);
        };
        document.body.appendChild(script);
    });
};

export const makePayment = async (amount, rideId, user, onSuccess) => {
    try {
        // Validate inputs
        if (!amount || amount <= 0) {
            throw new Error('Invalid amount');
        }

        console.log('Payment initialization with:', { amount, rideId, user });

        const res = await initializeRazorpay();
        if (!res) {
            throw new Error('Razorpay SDK failed to load');
        }

        // Configure Razorpay options
        const options = {
            key: "rzp_test_5XhKGpSXFOwnLs", // Test mode key
            amount: Math.round(amount * 100), // Convert to paise
            currency: "INR",
            name: "RideShare",
            description: "Ride Payment",
            handler: function(response) {
                console.log('Payment response:', response);
                // Call the success callback with the payment ID
                onSuccess(response.razorpay_payment_id);
            },
            prefill: {
                name: user.name || "",
                email: user.email || "",
                contact: user.phoneNumber || ""
            },
            theme: {
                color: "#4F46E5"
            },
            modal: {
                ondismiss: function() {
                    toast.info("Payment cancelled");
                }
            }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', function(response) {
            console.error('Payment failed:', response.error);
            toast.error(response.error.description || "Payment failed");
        });
        razorpay.open();

    } catch (error) {
        console.error('Payment error:', error);
        toast.error(error.message || "Error during payment initialization");
        throw error;
    }
}; 