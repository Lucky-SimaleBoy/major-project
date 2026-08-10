const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review=require("./review.js");
const Booking=require("./booking.js");
const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  image: {
   url:String,
   filename:String,
  },
  price: Number,
  address: {
    type: String,
    default: ""
  },
  location: String,
  country: String,
  latitude: Number,
  longitude: Number,
  reviews:[
    {
      type:Schema.Types.ObjectId,
      ref:"Review",
    }
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  bookedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  bookings: [
    {
      type: Schema.Types.ObjectId,
      ref: "Booking"
    }
  ]
});
listingSchema.post("findOneAndDelete",async(listing)=>{
  if(listing){
    await Review.deleteMany({_id:{$in:listing.reviews}});
    await Booking.deleteMany({ listing: listing._id });
  }
})
const listing = mongoose.model("listing", listingSchema);
module.exports = listing;
