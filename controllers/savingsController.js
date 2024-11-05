const Savings = require("../models/savingsModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const Wallets = require("../models/walletsModel");
const APIFeatures = require("../utils/apiFeatures");
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config({ path: "./.env" });
const {
  sendGroupedAssetTransactions,
  sendGroupedAlgoTransactions,
  groupOptOutTransactions,
  groupOptInTransactions,
  checkIfOptedIn,
  getMinFee,
  getMBR,
  getAccountInfo,
  transferAlgo,
  getAccount,
  optIn,
  optOut,
  transferAsset,
  getAssetBalance,
  getAccountBalance,
  microAlgosToAlgo,
  algoToMicroAlgos,
  getAssetInfo,
  convertFractionalAssetAmount,
  getAssetDecimals,
  refundCreator,
} = require("../utils/algoUtils");

const USDC_ASSET_ID = 10458941;
INTEREST_RATE = 15;

const createSavings = async (user, amount, duration) => {
  try {
    const adminUser = await User.findOne({ role: "admin" });
    const txID = await transferAsset(
      user.walletAddress,
      adminUser.walletID,
      USDC_ASSET_ID,
      amount,
      adminUser.walletID,
      "Savings created on ussdapp.com"
    );
    const savings = await Savings.create({
      amount: amount,
      duration: duration,
      userID: user._id,
      walletID: user.walletID,
      walletAddress: user.walletAddress,
      status: "active",
    });
    return savings;
  } catch (error) {
    console.log(error);
  }
};

const processSavings = async () => {
  const currentDate = new Date();

  // Find all active savings
  const activeSavings = await Savings.find({ status: "active" });

  for (const saving of activeSavings) {
    const startDate = new Date(saving.createdAt);
    const durationInDays = saving.duration;
    const expirationDate = new Date(
      startDate.getTime() + durationInDays * 24 * 60 * 60 * 1000
    );

    // Check if the savings has expired
    if (currentDate >= expirationDate) {
      const adminUser = await User.findOne({ role: "admin" });

      // Calculate the interest
      const durationInYears = durationInDays / 365;
      const interest = (
        saving.amount *
        INTEREST_RATE *
        durationInYears
      ).toFixed(2);

      // Transfer the amount + interest to the user
      const txID = await transferAsset(
        adminUser.walletAddress,
        saving.walletAddress,
        USDC_ASSET_ID,
        saving.amount + parseFloat(interest),
        adminUser.walletID,
        `Savings payout for user ${saving.userID}`
      );

      // Update the savings status to 'completed'
      if (txID) {
        saving.status = "completed";
      }
      await saving.save();
    }
  }
};

module.exports = {
  createSavings,
  processSavings,
};
