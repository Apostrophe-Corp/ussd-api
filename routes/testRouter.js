const express = require("express");
const router = express.Router();

const test = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Hello Labs",
  });
};

router.route("/test").get(test);

module.exports = router;
