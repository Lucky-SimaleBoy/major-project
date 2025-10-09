const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const passport = require("passport");
const wrapAsync = require("../middleware/wrapAsync.js");
const { saveRedirectUrl } = require("../middleware.js");
const listingControlers=require("../controlers/user.js")
// Show signin form
router.get("/signin", listingControlers.signupform);
// Handle signup form submission
router.post("/signup", wrapAsync(listingControlers.signupFormSubmision));



//login form
router.get("/login",listingControlers.renderloginForm); 
// login form post request
router.post("/login" ,saveRedirectUrl,passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
    }),listingControlers.login);

//logout
router.get("/logout",listingControlers.logout);


module.exports = router;