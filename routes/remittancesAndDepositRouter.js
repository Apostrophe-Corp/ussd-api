const express = require("express");
const router = express.Router();
const { getUserData } = require("../controllers/userController");

router.route("/user-data").get(getUserData);
module.exports = router;
