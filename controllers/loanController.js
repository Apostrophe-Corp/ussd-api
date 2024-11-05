const Loans = require("../models/loanModel");
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

const createLoan = async (user, amount, duration) => {
  try {
    const note = `Loan paid to ${user.username} on ussdapp.com`;
    const adminUser = await User.findOne({ role: "admin" });
    const txID = await transferAsset(
      adminUser.walletAddress,
      user.walletID,
      USDC_ASSET_ID,
      amount,
      adminUser.walletID,
      note
    );
    if (!txID) {
      return false;
    }
    const loan = await Loans.create({
      duration: duration,
      amount: amount,
      walletAddress: user.walletAddress,
      walletID: user.walletID,
      status: "active",
      userID: user._id,
    });

    return true;
  } catch (error) {
    console.log(error);
  }
};

const processLoans = async () => {
  const currentDate = new Date();

  // Find all active loans
  const activeLoans = await Loans.find({ status: "active" });

  for (const loan of activeLoans) {
    const startDate = new Date(loan.createdAt);
    const durationInDays = loan.duration;
    const expirationDate = new Date(
      startDate.getTime() + durationInDays * 24 * 60 * 60 * 1000
    );

    // Check if the loan has expired
    if (currentDate >= expirationDate) {
      const adminUser = await User.findOne({ role: "admin" });

      // Calculate the interest
      const durationInYears = durationInDays / 365;
      const interest = (loan.amount * INTEREST_RATE * durationInYears).toFixed(
        2
      );

      // Transfer the amount + interest from the user to the admin
      const balance = await getAssetBalance(loan.walletAddress, USDC_ASSET_ID);
      if (balance < loan.amount + parseFloat(interest)) {
        return;
      }
      const txID = await transferAsset(
        loan.walletAddress,
        adminUser.walletAddress,
        USDC_ASSET_ID,
        loan.amount + parseFloat(interest),
        loan.walletID,
        `Loan repayment for user ${loan.userID}`
      );

      // Update the loan status to 'completed'
      if (txID) {
        loan.status = "completed";
      }
      await loan.save();
    }
  }
};

module.exports = {
  createLoan,
  processLoans,
};
