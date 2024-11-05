const Ajo = require("../models/ajoModel");
const Contributions = require("../models/contributionsModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const Wallets = require("../models/walletsModel");
const APIFeatures = require("../utils/apiFeatures");
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config({ path: "./.env" });
const {
  sendGroupedAssetTransactions,
  sendGroupedAlgoTransactions,
  groupOptOutTransactions,
  groupOptInTransactions,
  checkIfOptedIn,
  getMinFee,
  getMBR,
  getAccountInfo,
  transferAlgo,
  getAccount,
  optIn,
  optOut,
  transferAsset,
  getAssetBalance,
  getAccountBalance,
  microAlgosToAlgo,
  algoToMicroAlgos,
  getAssetInfo,
  convertFractionalAssetAmount,
  getAssetDecimals,
} = require("../utils/algoUtils");
