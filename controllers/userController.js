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
  // Input validation
  if (!username || !phoneNumber || !pin) {
    throw new Error("Missing required parameters");
  }

  console.log("Starting user creation with:", { username, phoneNumber });

  // Log environment variables (excluding sensitive data)
  console.log("Environment check:", {
    WALLET_API_URL: process.env.WALLET_API_URL,
    MAIN_API_CLIENT_ID: process.env.MAIN_API_CLIENT_ID,
    SERVER_IP: process.env.SERVER_IP,
  });

  // Generate API client token for wallet management API
  const clientToken = jwt.sign(
    { clientId: process.env.MAIN_API_CLIENT_ID },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  try {
    console.log("Attempting wallet API request...");

    // Call wallet management API to create wallet
    const walletApiResponse = await axios({
      method: "post",
      url: `${process.env.WALLET_API_URL}/api/v1/user-wallet`,
      headers: {
        Authorization: `Bearer ${clientToken}`,
        "X-Forwarded-For": process.env.SERVER_IP,
      },
    }).catch((error) => {
      console.error("Axios request failed:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        },
      });
      throw error;
    });

    console.log("Wallet API response:", walletApiResponse?.data);

    if (
      !walletApiResponse?.data?.address ||
      !walletApiResponse?.data?.walletID
    ) {
      throw new Error(
        "Invalid wallet API response: Missing required wallet data"
      );
    }

    console.log("Creating user in database...");
    // Create user in USSD database
    const user = await User.create({
      username,
      phoneNumber,
      pin,
      walletAddress: walletApiResponse.data.address,
      walletID: walletApiResponse.data.walletID,
    });

    console.log("User created successfully:", {
      username: user.username,
      phoneNumber: user.phoneNumber,
      walletAddress: user.walletAddress,
      walletID: user.walletID,
    });

    return {
      username: user.username,
      phoneNumber: user.phoneNumber,
      walletAddress: user.walletAddress,
      walletID: user.walletID,
    };
  } catch (error) {
    console.error("Error in createUser:", {
      name: error.name,
      message: error.message,
      isAxiosError: error.isAxiosError,
      response: error.response?.data,
      status: error.response?.status,
    });

    if (error.isAxiosError) {
      // Handle network or axios specific errors
      if (!error.response) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw new Error(
        `Wallet API error (${error.response.status}): ${
          error.response.data.message || error.message
        }`
      );
    }

    // Handle mongoose errors
    if (error.name === "ValidationError") {
      throw new Error(`Database validation error: ${error.message}`);
    }

    // Re-throw other errors with more context
    throw new Error(`User creation failed: ${error.message}`);
  }
}

module.exports = { createUser };
