const listing = require("../models/listing.js");
const mongoose = require("mongoose");
const initData = require("./init/data.js");

const localListings = initData.data.map((item) => ({
  ...item,
  _id: new mongoose.Types.ObjectId(),
  owner: {
    username: "local-user",
    equals: () => false,
  },
  reviews: [],
}));

async function isValidLocation(location, country) {
  const query = [location, country].filter(Boolean).join(", ");
  if (!query.trim()) return false;

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "major-project-location-validator/1.0",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error("Location lookup failed");
  }

  const results = await response.json();
  return Array.isArray(results) && results.length > 0;
}

module.exports.index= async (req, res) => {
    try {
      const allListings = await listing.find({});
      return res.render("listing/index.ejs", { allListings });
    } catch (err) {
      return res.render("listing/index.ejs", { allListings: localListings });
    }
  };
  module.exports.renderForm= (req, res) => {
    res.render("listing/add.ejs");
  }
  module.exports.showListing=async (req, res, next) => {
    const { id } = req.params;
    
    // Check if id is a valid MongoDB ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      req.flash("error", "Invalid listing ID");
      return res.redirect("/listing");
    }
    
    try {
      const Listing = await listing
        .findById(id)
        .populate({
          path: "reviews",
          populate: {
            path: "author",
          },
        })
        .populate("owner");

      if (Listing) {
        return res.render("listing/show.ejs", { Listing });
      }
    } catch (err) {
      // fall back to local static data if DB is unavailable
    }

    const localListing = localListings.find((item) => item._id.toString() === id);
    if (localListing) {
      return res.render("listing/show.ejs", { Listing: localListing });
    }

    req.flash("error", "Listing you requested does not exist");
    return res.redirect("/listing");
  };
  module.exports.addListing=async (req, res, next) => {
    const isLocationOk = await isValidLocation(req.body.listing.location, req.body.listing.country);
    if (!isLocationOk) {
      req.flash("error", "Please enter a valid location and country.");
      return res.redirect("/listing/new");
    }

    if (!req.file) {
      req.flash("error", "Please upload an image.");
      return res.redirect("/listing/new");
    }

    let url = `/uploads/${req.file.filename}`;
    let filename = req.file.filename;
    let newListing = new listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };
    await newListing.save();
    req.flash("success", "New listing created");
    res.redirect("/listing");
  }
  module.exports.editListing=async (req, res) => {
    const { id } = req.params;
    const foundListing = await listing.findById(id);
    if (!foundListing) {
      req.flash("error", "Listing you requested does not exists");
      res.redirect("/listing");
    }
    res.render("listing/edit", { Listing: foundListing });
  }
  module.exports.updateListing=async (req, res, next) => {
    const { id } = req.params;
    const foundListing = await listing.findById(id);
    if (!foundListing) {
      req.flash("error", "Listing you requested does not exists");
      return res.redirect("/listing");
    }
    const updatedData = req.body.listing;

    const isLocationOk = await isValidLocation(updatedData.location, updatedData.country);
    if (!isLocationOk) {
      req.flash("error", "Please enter a valid location and country.");
      return res.redirect(`/listing/${id}/edit`);
    }

    // Handle image field properly
    if (updatedData.image && updatedData.image.trim() !== "") {
      updatedData.image = {
        url: updatedData.image,
        filename: foundListing.image?.filename || "",
      };
    } else {
      // Keep existing image if no new image provided
      updatedData.image = foundListing.image;
    }
    req.flash("success", "Listing updated ");
    await listing.findByIdAndUpdate(id, updatedData);
    res.redirect(`/listing/${id}`);
  };
  module.exports.destroyListing=async (req, res) => {
    const { id } = req.params;
    const deleteListing = await listing.findByIdAndDelete(id);
    console.log(deleteListing);
    req.flash("success", "Listing deleted");
    res.redirect("/listing");
  };