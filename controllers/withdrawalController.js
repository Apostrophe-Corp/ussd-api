const Withdrawal = require("../models/withdrawalModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Vendor = require("../models/vendorModel");
const User = require("../models/userModel");

const generateAlphanumericCode = () => {
  const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

const createWithdrawal = async (amount, phooneNumber, vendorNumber) => {
  const vendor = await Vendor.findOne({ vendorNumber });
  if (!vendor) {
    throw new Error("Vendor not found");
  }
  const user = await User.findOne({ phoneNumber: phooneNumber });
  if (!user) {
    throw new Error("User not found");
  }

  // Generate and check codes until we find one not used in pending withdrawals
  let withdrawalCode;
  let isPendingCodeExists;

  do {
    withdrawalCode = generateAlphanumericCode();
    isPendingCodeExists = await Withdrawal.findOne({
      withdrawalCode,
      status: "pending",
    });
  } while (isPendingCodeExists);

  const withdrawal = await Withdrawal.create({
    amount,
    user: user._id,
    vendor: vendor._id,
    withdrawalCode,
  });

  return withdrawal.withdrawalCode;
};

module.exports = {
  createWithdrawal,
};
