const mongoose = require("mongoose");

const userModel = mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please enter your username"],
  },
  phoneNumber: {
    type: String,
    required: [true, "Please enter your email"],
    unique: true,
  },
  pin: {
    type: Number,
    required: [true, "Please enter your password"],
  },
  walletAddress: {
    type: String,
    required: [true, "Please enter your wallet address"],
  },
  walletID: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Please enter your wallet ID"],
  },
  role: {
    type: String,
    default: "user",
    enum: ["admin", "user"],
    immutable: true,
  },
});

module.exports = mongoose.model("User", userModel);
