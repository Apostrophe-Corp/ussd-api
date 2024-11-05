const express = require("express");
const {
  createUser,
  getUserBalance,
  createAdmin,
  transfer,
} = require("../controllers/userController");
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

router.route("/test").post(createAdminUser);

module.exports = router;
