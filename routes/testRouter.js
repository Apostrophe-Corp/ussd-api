const express = require("express");
const User = require("../models/userModel");
const {
  createUser,
  getUserBalance,
  createAdmin,
  transfer,
} = require("../controllers/userController");
const { createLoan } = require("../controllers/loanController");
const { createSavings } = require("../controllers/savingsController");
const {
  createAjo,
  joinAjo,
  getAjoData,
} = require("../controllers/ajoController");
const { createWithdrawal } = require("../controllers/withdrawalController");
const catchAsync = require("../utils/catchAsync");
const router = express.Router();

const createUserTest = catchAsync(async (req, res, next) => {
  const { username, phoneNumber, pin } = req.body;
  const user = await createUser(username, phoneNumber, pin);
  res.status(200).json({
    status: "success",
    user: user,
  });
});

const CreateAjoTest = catchAsync(async (req, res, next) => {
  const { amount, count, period, phoneNumber } = req.body;
  const user = await User.findOne({ phoneNumber });
  const contributorCount = count;
  const contributionPeriod = period;
  const ajo = await createAjo(
    contributionPeriod,
    amount,
    contributorCount,
    user
  );
  res.status(200).json({
    status: "success",
    ajo: ajo,
  });
});

const joinAjoTest = catchAsync(async (req, res, next) => {
  const { ajoCode, phoneNumber } = req.body;
  const user = await User.findOne({ phoneNumber });
  console.log("user", user);
  const ajo = await joinAjo(ajoCode, user);
  console.log("ajo", ajo);
  res.status(200).json({
    status: "success",
    ajo: ajo,
  });
});

const createLoanTest = catchAsync(async (req, res, next) => {
  const { amount, phoneNumber, duration } = req.body;
  const user = await User.findOne({ phoneNumber });
  const loan = await createLoan(user, amount, duration);
  res.status(200).json({
    status: "success",
    loan: loan,
  });
});

const createSavingsTest = catchAsync(async (req, res, next) => {
  const { amount, phoneNumber, duration } = req.body;
  const user = await User.findOne({ phoneNumber });
  const savings = await createSavings(user, amount, duration);
  res.status(200).json({
    status: "success",
    savings: savings,
  });
});

const createAdminUser = catchAsync(async (req, res, next) => {
  const { username, phoneNumber, pin } = req.body;
  const admin = await createAdmin(username, phoneNumber, pin);
  res.status(200).json({
    status: "success",
    admin: admin,
  });
});

const testTransfer = catchAsync(async (req, res, next) => {
  const { from, to, amount } = req.body;
  const txn = await transfer(from, to, amount);
  res.status(200).json({
    status: "success",
    txn: txn,
  });
});

const testWithdrawal = catchAsync(async (req, res, next) => {
  const { amount, phoneNumber, vendorNumber } = req.body;
  const withdrawal = await createWithdrawal(amount, phoneNumber, vendorNumber);
  res.status(200).json({
    status: "success",
    withdrawal: withdrawal,
  });
});

const testGetAjoData = catchAsync(async (req, res, next) => {
  const { ajoCode } = req.body;
  const ajo = await getAjoData(ajoCode);
  res.status(200).json({
    status: "success",
    ajo: ajo,
  });
});

// router.route("/test").post(createAdminUser);
router.route("/ajo").post(CreateAjoTest).patch(joinAjoTest).get(testGetAjoData);
router.route("/loan").post(createLoanTest);
router.route("/savings").post(createSavingsTest);
router.route("/user").post(createUserTest);
router.route("/transfer").post(testTransfer);
router.route("/withdrawal").post(testWithdrawal);

module.exports = router;
