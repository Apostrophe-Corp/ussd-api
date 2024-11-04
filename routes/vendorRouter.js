const express = require("express");
const router = express.Router();

const {
  createVendor,
  getVendors,
  getVendor,
  withdraw,
} = require("../controllers/vendorController");

router.route("/vendors").post(createVendor).get(getVendors);
router.route("/vendor/:id").get(getVendor);
router.route("/withdrawals").post(withdraw);

module.exports = router;
