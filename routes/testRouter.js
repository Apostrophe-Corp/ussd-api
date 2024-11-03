const express = require("express");
const { createUser } = require("../controllers/userController");
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

router.route("/test").post(createUserTest);

module.exports = router;
