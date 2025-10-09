const Review = require('../models/review.js');
const listing = require("../models/listing.js");

module.exports.createNewReview=async (req, res) => {
    let Listing = await listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    await newReview.save();
    Listing.reviews.push(newReview._id);
    await Listing.save();
    req.flash("success","New review was created");
    res.redirect(`/listing/${Listing._id}`);
};
module.exports.destroyReview=async (req, res) => {
    const { id, reviewId } = req.params;
    await listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success","Review was deleted");
    res.redirect(`/listing/${id}`);
};