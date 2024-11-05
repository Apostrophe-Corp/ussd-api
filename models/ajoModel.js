const mongoose = require("mongoose");

const ajoSchema = new mongoose.Schema({
  contributionPeriod: {
    type: String,
    required: true,
    enum: ["daily", "weekly", "monthly"],
  },
  lastPaymentDate: {
    type: Date,
  },
  amount: {
    type: Number,
    required: true,
  },
  unpaid: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
  },
  paid: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
  },
  status: {
    type: String,
    enum: ["active", "pending", "completed"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  code: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Ajo", ajoSchema);
