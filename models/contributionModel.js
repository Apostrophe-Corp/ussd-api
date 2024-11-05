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
    default: 0,
  },
  amountReceived: {
    type: Number,
    default: 0,
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
