const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const { types, string } = require('joi');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true
  }
});

// ✅ This adds username, hash, salt, and .authenticate() method
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
