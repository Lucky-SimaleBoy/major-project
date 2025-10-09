const listing=require("./models/listing.js");
const Review=require("./models/review.js")
const ExpressError=require("./middleware/expressError.js");
const {schemalisting,reviewSchema}=require("./schema.js");
module.exports.isLoggedIn=(req,res,next)=>{
    if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl;
        req.flash("error","You must be logged in to perform this action");
        return res.redirect("/login");
    }
    next();
}
// login karne ke bad bhi page khule jo kholna chate hai hoti hai 
module.exports.saveRedirectUrl=(req,res,next)=>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl=req.session.redirectUrl;
    }
next();
}
//check the owner hai ki nahi listing ka for edit and delete
module.exports.isOwner= async(req,res,next)=>{
    const { id } = req.params;
    let Listing=await listing.findById(id);
    if(!Listing.owner.equals(res.locals.currentUser._id)){
        req.flash("error","You are not the owner if this so you can't edit");
        res.redirect(`/listing/${id}`);
    }
    next();
}
//give error for anything
module.exports.validateListing=(req,res,next)=>{
    const { error } = schemalisting.validate(req.body);

    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
}
module.exports.validateReview=(req,res,next)=>{
    const { error } = reviewSchema.validate(req.body);

    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    } 
};
//review authorization to delete review 
module.exports.isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;
    let review = await Review.findById(reviewId);
    if (!review || !review.author.equals(req.user._id)) {
        req.flash("error", "You are not the author of this review, so you can't delete it");
        return res.redirect(`/listing/${id}`);
    }
    next();
}

// Special middleware for review deletion that handles redirect properly
module.exports.isLoggedInForReview = (req, res, next) => {
    if (!req.isAuthenticated()) {
        // For review deletion, always redirect to the listing page
        const listingId = req.params.id;
        req.session.redirectUrl = `/listing/${listingId}`;
        req.flash("error", "You must be logged in to perform this action");
        return res.redirect("/login");
    }
    next();
}