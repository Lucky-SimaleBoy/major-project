const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
  listing: {
    type: Schema.Types.ObjectId,
    ref: "listing",
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["booked", "cancelled"],
    default: "booked"
  },
  amount: {
    type: Number,
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    required: true
  },
  nights: {
    type: Number,
    required: true
  },
  rooms: {
    type: Number,
    default: 1,
    required: true
  },
  adults: {
    type: Number,
    default: 1,
    required: true
  },
  children: {
    type: Number,
    default: 0,
    required: true
  },
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  transactionId: String,
  paymentId: String,
  orderId: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Booking", bookingSchema);
