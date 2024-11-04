const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { getAssetBalance, transferAsset } = require("../utils/algoUtils");

/**
 * Creates a user in the USSD system and their corresponding wallet
 * @param {string} username - User's username
 * @param {string} phoneNumber - User's phone number
 * @param {number} pin - User's PIN
 * @returns {Promise<Object>} Created user object
 */
async function createUser(username, phoneNumber, pin) {
  const startTime = Date.now();

  // Input validation
  if (!username || !phoneNumber || !pin) {
    console.error("[createUser] Missing required parameters", {
      username,
      phoneNumber,
    });
    throw new Error("Missing required parameters");
  }

  const baseUrl = process.env.WALLET_API_URL.endsWith("/")
    ? process.env.WALLET_API_URL.slice(0, -1)
    : process.env.WALLET_API_URL;
  try {
    const requestConfig = {
      method: "post",
      url: `${baseUrl}/user-wallet`,
      headers: {
        "x-forwarded-for": process.env.SERVER_IP,
        "x-client-id": process.env.MAIN_API_CLIENT_ID,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds
    };

    const walletApiResponse = await axios(requestConfig).catch((error) => {
      console.error("[createUser] Axios request failed", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        timeElapsed: `${(Date.now() - startTime) / 1000}s`,
        headers: error.response?.headers,
        code: error.code,
        isTimeout: error.code === "ECONNABORTED",
      });
      throw error;
    });

    if (
      !walletApiResponse?.data?.address ||
      !walletApiResponse?.data?.walletID
    ) {
      throw new Error(
        "Invalid wallet API response: Missing required wallet data"
      );
    }
    const user = await User.create({
      username,
      phoneNumber,
      pin,
      walletAddress: walletApiResponse.data.address,
      walletID: walletApiResponse.data.walletID,
    });

    return {
      username: user.username,
      phoneNumber: user.phoneNumber,
      walletAddress: user.walletAddress,
      walletID: user.walletID,
    };
  } catch (error) {
    console.error("[createUser] Error occurred", {
      name: error.name,
      message: error.message,
      isAxiosError: error.isAxiosError,
      response: error.response?.data,
      status: error.response?.status,
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
      stack: error.stack,
    });
    throw error;
  }
}

const getUserBalance = async (phoneNumber) => {
  const user = await User.findOne({ phoneNumber });
  const balance = await getAssetBalance(
    user.walletAddress,
    Number(process.env.USDC_ASSET_ID)
  );

  return balance;
};

const transfer = async (from, to, amount) => {
  const sender = await User.findOne({ phoneNumber: from });
  const receiver = await User.findOne({ phoneNumber: to });
  const note = `Transfer from ${sender.username} to ${receiver.username} on ussdapp.com`;
  const txn = await transferAsset(
    sender.walletAddress,
    receiver.walletAddress,
    Number(process.env.USDC_ASSET_ID),
    amount,
    sender.walletID,
    note
  );
  return txn;
};

const checkUserExists = async (phoneNumber) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    return false;
  }
  return user;
};

const checkPinIsCorrect = async (phoneNumber, pin) => {
  const user = await User.findOne({ phoneNumber });
  if (!user) {
    return false;
  }
  return user.pin === pin;
};

module.exports = {
  createUser,
  getUserBalance,
  transfer,
  checkUserExists,
  checkPinIsCorrect,
};
