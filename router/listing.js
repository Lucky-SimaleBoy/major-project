const express = require("express");
const router = express.Router();
const wrapAsync = require("../middleware/wrapAsync.js");
const listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const user = require("../models/user.js");
const  listingControlers=require("../controlers/index.js")
const multer  = require('multer')
const {storage}=require("../cloudConfig.js");
const upload = multer({storage })
//index route
router.get(
  "/",
  wrapAsync(listingControlers.index)
);

//create new listing
router.get("/new", isLoggedIn,listingControlers.renderForm);

//show route
router.get(
  "/:id",
  wrapAsync(listingControlers.showListing)
);
// add listing
router.post(
  "/",isLoggedIn,
upload.single('listing[image]'),
  validateListing,
  wrapAsync(listingControlers.addListing)
);

//edit route
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingControlers.editListing)
);
//update the route
router.put(
  "/:id",
  validateListing,
  isOwner,
  wrapAsync(listingControlers.updateListing)
);

// delete route
router.delete(
  "/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(listingControlers.destroyListing)
);


module.exports = router;
