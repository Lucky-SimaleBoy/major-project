const User = require("../models/user.js");
const listing = require("../models/listing.js");
const Booking = require("../models/booking.js");
const { applyAdminRoleIfNeeded } = require("../utils/userRole.js");

module.exports.signupform = (req, res) => {
  res.render("user/form.ejs");
};

module.exports.signupFormSubmision = async (req, res, next) => {
  try {
    const { username, email, password, registerAsHost } = req.body;
    const role = registerAsHost === "on" ? "admin" : "user";
    const user = new User({ email, username, role });
    const registeredUser = await User.register(user, password);
    await applyAdminRoleIfNeeded(registeredUser, email, registerAsHost);

    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      }
      const welcome =
        registeredUser.role === "admin"
          ? "Welcome, host! You can add listings from your dashboard."
          : "Welcome! You can book rooms and view them under My Bookings.";
      req.flash("success", welcome);
      const redirectTo = registeredUser.role === "admin" ? "/dashboard" : "/listing";
      res.redirect(redirectTo);
    });
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
};

module.exports.renderloginForm = (req, res) => {
  res.render("user/login.ejs");
};

module.exports.login = async (req, res) => {
  if (!req.user.role) {
    req.user.role = "user";
    await req.user.save();
  }
  await applyAdminRoleIfNeeded(req.user, req.user.email, false);
  const ownsListing = await listing.exists({ owner: req.user._id });
  if (ownsListing && req.user.role !== "admin") {
    req.user.role = "admin";
    await req.user.save();
  }
  req.flash("success", "Welcome back!");
  let redirectUrl = res.locals.redirectUrl || "/listing";
  if (req.session.redirectUrl) {
    delete req.session.redirectUrl;
  }
  if (req.user.role === "admin" && redirectUrl === "/listing") {
    redirectUrl = "/dashboard";
  }
  res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "Logged out successfully");
    res.redirect("/listing");
  });
};

module.exports.adminDashboard = async (req, res, next) => {
  try {
    const myListings = await listing.find({ owner: req.user._id }).sort({ createdAt: -1 });
    const listingIds = myListings.map((item) => item._id);

    const guestBookings = await Booking.find({
      listing: { $in: listingIds }
    })
      .populate({
        path: "listing",
        select: "title location country price"
      })
      .populate({
        path: "user",
        select: "username email"
      })
      .sort({ createdAt: -1 });

    const totalListings = myListings.length;
    const bookedListings = myListings.filter((item) => item.isBooked).length;

    res.render("user/admin-dashboard.ejs", {
      myListings,
      guestBookings,
      totalListings,
      bookedListings
    });
  } catch (err) {
    next(err);
  }
};

module.exports.myBookings = async (req, res, next) => {
  try {
    const myBookings = await Booking.find({ user: req.user._id })
      .populate({
        path: "listing",
        select: "title location country price image"
      })
      .sort({ createdAt: -1 });

    res.render("user/my-bookings.ejs", { myBookings });
  } catch (err) {
    next(err);
  }
};
