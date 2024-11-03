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

  // Generate API client token for wallet management API
  const clientToken = jwt.sign(
    {
      clientId: process.env.MAIN_API_CLIENT_ID,
      // Add any additional claims that might be needed for verification
    },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  // Construct the base URL properly
  const baseUrl = process.env.WALLET_API_URL.endsWith("/")
    ? process.env.WALLET_API_URL.slice(0, -1)
    : process.env.WALLET_API_URL;

  try {
    console.log("Attempting wallet API request...");

    const requestConfig = {
      method: "post",
      url: `${baseUrl}/user-wallet`,
      headers: {
        Authorization: `Bearer ${clientToken}`,
        "X-Forwarded-For": process.env.SERVER_IP,
        "Content-Type": "application/json", // Changed from default urlencoded
      },
    };

    console.log("Request configuration:", {
      url: requestConfig.url,
      method: requestConfig.method,
      headers: {
        ...requestConfig.headers,
        Authorization: "Bearer [TOKEN HIDDEN]", // Don't log the actual token
      },
    });

    const walletApiResponse = await axios(requestConfig).catch((error) => {
      console.error("Axios request failed:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
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

    console.log("User created successfully");

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
      if (error.response?.status === 403) {
        throw new Error(
          "Authorization failed with wallet API. Please check MAIN_API_CLIENT_ID, JWT_SECRET, and SERVER_IP"
        );
      }
      throw new Error(
        `Wallet API error (${error.response?.status}): ${
          error.response?.data?.message || error.message
        }`
      );
    }

    throw error;
  }
}

module.exports = { createUser };
