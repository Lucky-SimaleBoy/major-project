const listing = require("../models/listing.js");

module.exports.index= async (req, res) => {
    const allListings = await listing.find({});
    res.render("listing/index.ejs", { allListings });
  };
  module.exports.renderForm= (req, res) => {
    res.render("listing/add.ejs");
  }
  module.exports.showListing=async (req, res) => {
    const { id } = req.params;
    const Listing = await listing
      .findById(id)
      .populate({
        path: "reviews",
        populate: {
          path: "author",
        },
      })
      .populate("owner");
    if (!Listing) {
      req.flash("error", "Listing you requested does not exists");
      res.redirect("/listing");
    }

    res.render("listing/show.ejs", { Listing });
  };
  module.exports.addListing=async (req, res, next) => {
    let url = req.file.path;
    let filename = req.file.filename;
    let newListing = new listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image={url,filename};
    await newListing.save(); // Await the save operation
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
    const updatedData = req.body.listing;

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