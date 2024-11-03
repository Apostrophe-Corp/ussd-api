const axios = require("axios");
const jwt = require("jsonwebtoken"); // for generating API client token
const User = require("../models/userModel"); // Adjust path as needed

/**
 * Creates a user in the USSD system and their corresponding wallet
 * @param {string} username - User's username
 * @param {string} phoneNumber - User's phone number
 * @param {number} pin - User's PIN
 * @returns {Promise<Object>} Created user object
 */
async function createUser(username, phoneNumber, pin) {
  // Input validation
  if (!username || !phoneNumber || !pin) {
    throw new Error("Missing required parameters");
  }

  // Generate API client token for wallet management API
  const clientToken = jwt.sign(
    { clientId: process.env.MAIN_API_CLIENT_ID },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  try {
    // Call wallet management API to create wallet
    const walletApiResponse = await axios({
      method: "post",
      url: `${process.env.WALLET_API_URL}/api/v1/user-wallet`,
      headers: {
        Authorization: `Bearer ${clientToken}`,
        "X-Forwarded-For": process.env.SERVER_IP, // If IP whitelist is enabled
      },
    });

    // Create user in USSD database
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
    // If wallet creation failed
    if (error.response) {
      throw new Error(
        `Wallet creation failed: ${error.response.data.message || "Unknown error"}`
      );
    }
    // If database operation failed or other errors
    throw error;
  }
}

module.exports = { createUser };
