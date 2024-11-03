const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

/**
 * Creates a user in the USSD system and their corresponding wallet
 * @param {string} username - User's username
 * @param {string} phoneNumber - User's phone number
 * @param {number} pin - User's PIN
 * @returns {Promise<Object>} Created user object
 */
async function createUser(username, phoneNumber, pin) {
  const startTime = Date.now();
  console.log("[createUser] Starting user creation process", {
    username,
    phoneNumber,
    timestamp: new Date().toISOString(),
  });

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

  console.log("[createUser] Using wallet API URL:", baseUrl);

  try {
    const requestConfig = {
      method: "post",
      url: `${baseUrl}/user-wallet`,
      headers: {
        "X-Forwarded-For": process.env.SERVER_IP,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds
    };

    console.log("[createUser] Making wallet API request", {
      url: requestConfig.url,
      method: requestConfig.method,
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
    });

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

    console.log("[createUser] Received wallet API response", {
      status: walletApiResponse?.status,
      hasAddress: Boolean(walletApiResponse?.data?.address),
      hasWalletId: Boolean(walletApiResponse?.data?.walletID),
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
    });

    if (
      !walletApiResponse?.data?.address ||
      !walletApiResponse?.data?.walletID
    ) {
      throw new Error(
        "Invalid wallet API response: Missing required wallet data"
      );
    }

    console.log("[createUser] Creating user in database");
    const user = await User.create({
      username,
      phoneNumber,
      pin,
      walletAddress: walletApiResponse.data.address,
      walletID: walletApiResponse.data.walletID,
    });

    console.log("[createUser] User created successfully", {
      username: user.username,
      walletAddress: user.walletAddress,
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
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
module.exports = { createUser };
