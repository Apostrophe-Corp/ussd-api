const mongoose = require("mongoose");

const contributionSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
  },
  walletID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  ajoID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Ajo",
  },
  amountContributed: {
    type: Number,
    required: true,
  },
  amountReceived: {
    type: Number,
    required: true,
  },
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Contribution", contributionSchema);
