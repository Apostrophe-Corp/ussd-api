const mongoose = require("mongoose");

const walletsSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
  },
  walletID: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "pending", "unavailable"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Wallets", walletsSchema);
