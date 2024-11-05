const express = require("express");
const router = express.Router();

const {
  getAirdrops,
  getAirdrop,
  createAirdropStep1,
  createAirdropStep2,
} = require("../controllers/airdropController");

router.route("/airdrops").get(getAirdrops).post(createAirdropStep1);
router.route("/airdrop/:id").get(getAirdrop).post(createAirdropStep2);

module.exports = router;
