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
    const res = await initializeRazorpay();

    if (!res) {
        alert('Razorpay SDK failed to load');
        return;
    }

    try {
        const response = await fetch('/api/payments/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount,
                rideId
            }),
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        const options = {
            key: process.env.REACT_APP_RAZORPAY_KEY_ID,
            amount: data.order.amount,
            currency: data.order.currency,
            name: "Ride Sharing",
            description: "Ride Booking Payment",
            order_id: data.order.id,
            handler: async function (response) {
                try {
                    const verificationResponse = await fetch('/api/payments/verify-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        }),
                        credentials: 'include'
                    });

                    const verificationData = await verificationResponse.json();

                    if (verificationData.success) {
                        onSuccess(response.razorpay_payment_id);
                    }
                } catch (error) {
                    console.error('Payment verification failed:', error);
                    alert('Payment verification failed');
                }
            },
            prefill: {
                name: user.name,
                email: user.email,
                contact: user.phoneNumber
            },
            theme: {
                color: "#3399cc"
            }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();

    } catch (error) {
        console.error('Payment initialization failed:', error);
        alert('Payment initialization failed');
    }
}; 