const express = require("express");
const {
  createUser,
  getUserBalance,
  transfer,
} = require("../controllers/userController");
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

const testTransfer = catchAsync(async (req, res, next) => {
  const { from, to, amount } = req.body;
  const txn = await transfer(from, to, amount);
  res.status(200).json({
    status: "success",
    txn: txn,
  });
});

router.route("/test").post(testTransfer);

module.exports = router;
