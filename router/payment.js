const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay Order
router.post("/create-order", async (req, res) => {
  try {
    const { listingId, amount, description, customerName, customerEmail } = req.body;

    // Validate required fields
    if (!listingId || !amount || !description || !customerName || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields."
      });
    }

    // Razorpay expects amount in paise (multiply by 100)
    const amountInPaise = Math.round(amount * 100);

    // Create order
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `listing_${listingId}_${Date.now()}`,
      description: description,
      customer_notify: 1,
      notes: {
        listingId: listingId,
        customerName: customerName,
        customerEmail: customerEmail
      }
    };

    const order = await razorpay.orders.create(options);

    console.log("Razorpay Order Created:", {
      orderId: order.id,
      amount: amount,
      listingId: listingId,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: amount,
      amountInPaise: amountInPaise,
      keyId: process.env.RAZORPAY_KEY_ID,
      message: "Order created successfully"
    });

  } catch (error) {
    console.error("Order creation error:", error);
    return res.status(500).json({
      success: false,
      message: `Failed to create order: ${error.message}`
    });
  }
});

// Verify Payment
router.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, listingId, amount } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification details."
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("Signature mismatch:", {
        expected: expectedSignature,
        received: razorpay_signature
      });
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature."
      });
    }

    // Log successful payment
    const transactionId = generateTransactionId();
    console.log("Payment Verified Successfully:", {
      transactionId: transactionId,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      listingId: listingId,
      amount: amount,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully!",
      transactionId: transactionId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: amount
    });

  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed. Please contact support."
    });
  }
});

// Generate unique transaction ID
function generateTransactionId() {
  return 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

module.exports = router;
