const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../middleware/wrapAsync.js");
const listing = require("../models/listing.js");
const {validateReview,isLoggedIn,isReviewAuthor,isLoggedInForReview}=require("../middleware.js")
const Review = require('../models/review.js');
const  listingControlers=require("../controlers/review.js")
//create review
router.post("/",  isLoggedIn,validateReview, wrapAsync(listingControlers.createNewReview));

// delete review route
router.delete("/:reviewId", isLoggedInForReview,isReviewAuthor,wrapAsync(listingControlers.destroyReview));

module.exports = router;