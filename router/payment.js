const express = require("express");
const router = express.Router();
const listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const { isLoggedIn } = require("../middleware.js");
const { sendBookingConfirmation } = require("../services/notificationService.js");

function generateTransactionId() {
  return "TXN-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9).toUpperCase();
}

router.post("/confirm-booking", isLoggedIn, async (req, res) => {
  try {
    const {
      listingId,
      customerName,
      customerEmail,
      customerPhone,
      bookingData
    } = req.body;

    const phoneDigits = (customerPhone || "").replace(/\D/g, "");

    if (!listingId || !customerName || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: "Please provide your name and email."
      });
    }

    if (phoneDigits.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number."
      });
    }

    const foundListing = await listing.findById(listingId);
    if (!foundListing) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }
    if (foundListing.isBooked) {
      return res.status(400).json({ success: false, message: "This room is already booked." });
    }

    const details = bookingData || {};
    const transactionId = generateTransactionId();

    const newBooking = new Booking({
      listing: listingId,
      user: req.user._id,
      status: "booked",
      amount: details.amount || 0,
      checkIn: details.checkIn ? new Date(details.checkIn) : new Date(),
      checkOut: details.checkOut ? new Date(details.checkOut) : new Date(),
      nights: details.nights || 1,
      rooms: details.rooms || 1,
      adults: details.adults || 1,
      children: details.children || 0,
      customerName,
      customerEmail,
      customerPhone: phoneDigits,
      transactionId,
      paymentId: transactionId,
      orderId: transactionId
    });

    await newBooking.save();
    foundListing.isBooked = true;
    foundListing.bookedBy = req.user._id;
    foundListing.bookings.push(newBooking._id);
    await foundListing.save();

    const notificationResults = await sendBookingConfirmation({
      customerName,
      customerEmail,
      customerPhone: phoneDigits,
      listing: foundListing,
      booking: newBooking,
      transactionId
    });

    const smsResult = notificationResults.sms || {};
    const smsSent = !!smsResult.sent;
    const emailSent = !!notificationResults.email?.sent;
    const viaWhatsApp = smsResult.provider === "whatsapp";

    if (smsSent && viaWhatsApp) {
      req.flash(
        "success",
        `Room "${foundListing.title}" booked! Receipt sent on WhatsApp to ${phoneDigits}.`
      );
    } else if (smsSent) {
      req.flash(
        "success",
        `Room "${foundListing.title}" booked! Receipt SMS sent to ${phoneDigits}.`
      );
    } else if (emailSent) {
      const smsNote = smsResult.userMessage ? ` (${smsResult.userMessage})` : "";
      req.flash(
        "success",
        `Room "${foundListing.title}" booked! Full receipt sent to ${customerEmail}.${smsNote}`
      );
    } else {
      const smsNote =
        smsResult.userMessage ||
        "Add EMAIL_USER + EMAIL_PASS (Gmail) or recharge Fast2SMS wallet (₹100+) in .env.";
      req.flash(
        "success",
        `Room "${foundListing.title}" is booked! Receipt is on your dashboard. ${smsNote}`
      );
    }

    if (!smsSent && smsResult.reason) {
      req.flash("error", smsResult.userMessage || smsResult.reason);
    }

    return res.status(200).json({
      success: true,
      transactionId,
      amount: details.amount,
      redirectUrl: "/my-bookings#your-reservations",
      smsSent,
      emailSent,
      smsProvider: smsResult.provider || null
    });
  } catch (error) {
    console.error("Confirm booking error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not complete booking. Please try again."
    });
  }
});

module.exports = router;
