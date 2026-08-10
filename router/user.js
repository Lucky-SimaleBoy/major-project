const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const passport = require("passport");
const wrapAsync = require("../middleware/wrapAsync.js");
const { saveRedirectUrl, isLoggedIn, isAdmin } = require("../middleware.js");
const listingControlers=require("../controlers/user.js")
// Show signup form (support both /signin and /signup)
router.get("/signin", listingControlers.signupform);
router.get("/signup", listingControlers.signupform);
// Handle signup form submission
router.post("/signup", wrapAsync(listingControlers.signupFormSubmision));

//login form
router.get("/login",listingControlers.renderloginForm); 
// login form post request
router.post("/login" ,saveRedirectUrl,passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
    }),listingControlers.login);

// host (admin) dashboard — listings they added + guest bookings
router.get("/dashboard", isAdmin, wrapAsync(listingControlers.adminDashboard));

// guest dashboard — rooms this user booked
router.get("/my-bookings", isLoggedIn, wrapAsync(listingControlers.myBookings));

//logout
router.get("/logout",listingControlers.logout);

module.exports = router;