const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  walletAddress: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  vendorNumber: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Vendor", vendorSchema);
