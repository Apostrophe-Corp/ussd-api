const mongoose = require("mongoose");

const AirdropSchema = new mongoose.Schema({
  walletID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet",
    required: true,
  },
  walletAddress: {
    type: String,
    required: true,
  },
  organizationName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  beneficiaries: {
    type: [String],
    required: true,
  },
  status: {
    type: String,
    default: "stage1",
    enum: ["active", "stage1", "stage2", "pending", "completed"],
  },
  creatorAddress: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  period: {
    type: String,
    enum: ["daily", "weekly", "monthly", "yearly"],
  },
  lastPaymentDate: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model("Airdrop", AirdropSchema);
