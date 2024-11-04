const Vendor = require("../models/vendorModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Withdrawal = require("../models/withdrawalModel");

const { transferAsset } = require("../utils/algoUtils");

const createVendor = catchAsync(async (req, res, next) => {
  const vendorCount = await Vendor.countDocuments();
  req.body.vendorNumber = vendorCount + 1;
  const vendor = await Vendor.create(req.body);
  res.status(200).json({
    status: "success",
    vendor: vendor,
  });
});

const getVendors = catchAsync(async (req, res, next) => {
  const vendors = await Vendor.find();
  res.status(200).json({
    status: "success",
    vendors: vendors,
  });
});

const getVendor = catchAsync(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    return next(new AppError("Vendor not found", 404));
  }
  res.status(200).json({
    status: "success",
    vendor: vendor,
  });
});

const withdraw = catchAsync(async (req, res, next) => {
  const { withdrawalCode } = req.body;
  const withdrawal = await Withdrawal.findOne({ withdrawalCode });
  if (!withdrawal) {
    return next(new AppError("Withdrawal not found", 404));
  }

  const vendor = await Vendor.findById(withdrawal.vendor);
  if (!vendor) {
    return next(new AppError("Vendor not found", 404));
  }

  const user = await User.findById(withdrawal.user);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  const note = `Withdrawal from ${user.username} to ${vendor.username} on ussdapp.com`;

  const txn = await transferAsset(
    user.walletAddress,
    vendor.walletAddress,
    Number(process.env.USDC_ASSET_ID),
    withdrawal.amount,
    user.walletID,
    note
  );

  if (txn) {
    await Withdrawal.findByIdAndUpdate(withdrawal._id, {
      status: "completed",
    });
  } else {
    return next(new AppError("Withdrawal failed", 404));
  }

  res.status(200).json({
    status: "success",
    txn: txn,
  });
});

const checkVendorExists = async (vendorNumber) => {
  const vendor = await Vendor.findOne({ vendorNumber });
  if (!vendor) {
    return false;
  }
  return true;
};

module.exports = {
  createVendor,
  getVendors,
  getVendor,
  withdraw,
  checkVendorExists,
};
