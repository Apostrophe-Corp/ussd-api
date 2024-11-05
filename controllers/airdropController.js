const Airdrop = require("../models/airdropModel");
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
  refundCreator,
} = require("../utils/algoUtils");

const USDC_ASSET_ID = 10458941;

const createProjectWallet = async () => {
  const startTime = Date.now();
  const baseUrl = process.env.WALLET_API_URL.endsWith("/")
    ? process.env.WALLET_API_URL.slice(0, -1)
    : process.env.WALLET_API_URL;
  try {
    const requestConfig = {
      method: "post",
      url: `${baseUrl}/project-wallet`,
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
    const wallet = await Wallets.create({
      walletAddress: walletApiResponse.data.address,
      walletID: walletApiResponse.data.walletID,
    });

    return {
      walletAddress: wallet.walletAddress,
      walletID: wallet.walletID,
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
};

const createAirdropStep1 = catchAsync(async (req, res, next) => {
  const wallets = await Wallets.find({ status: "available" });
  let walletID;
  let walletAddress;
  if (wallets.length === 0) {
    const tmp = await createProjectWallet();
    walletID = tmp.walletID;
    walletAddress = tmp.walletAddress;
    await Wallets.create({ walletAddress, walletID });
  } else {
    walletID = wallets[0].walletID;
    walletAddress = wallets[0].walletAddress;
  }
  req.body["walletID"] = walletID;
  req.body["walletAddress"] = walletAddress;
  const airdrop = await Airdrop.create(req.body);
  res.status(200).json({
    success: true,
    airdropID: airdrop._id,
    walletAddress: walletAddress,
  });
});

const createAirdropStep2 = catchAsync(async (req, res, next) => {
  const airdrop = await Airdrop.findById(req.params.id);
  if (!airdrop) {
    return next(new AppError("Airdrop not found", 404));
  }
  await Airdrop.findByIdAndUpdate(req.params.id, { status: "active" });
  await Wallets.findByIdAndUpdate(airdrop.walletID, { status: "unavailable" });
  res.status(200).json({
    success: true,
    airdrop: airdrop,
  });
});

const getAirdrops = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Airdrop.find(), req.query)
    .filter()
    .sort("-createdAt")
    .limitFields()
    .paginate();
  const projects = await features.query;
  const excludedFields = ["page", "sort", "limit", "fields"];
  excludedFields.forEach((el) => delete req.query[el]);
  total = await Airdrop.find(req.query).countDocuments();
  res.status(200).json({
    success: true,
    airdrops: projects,
    total,
  });
});

const getAirdrop = catchAsync(async (req, res, next) => {
  const airdrop = await Airdrop.findById(req.params.id);
  if (!airdrop) {
    return next(new AppError("Airdrop not found", 404));
  }
  res.status(200).json({
    success: true,
    airdrop: airdrop,
  });
});

const getSnapshot = async () => {
  try {
    const currentDate = new Date();
    const projects = await Airdrop.find({ status: "active" });

    const filteredProjects = projects.filter((project) => {
      const lastPaymentDate = project.lastPaymentDate
        ? new Date(project.lastPaymentDate)
        : null;
      // TODO: change period map for daily back to this 23 * 60 * 60 * 1000,
      const periodMap = {
        daily: 14 * 60 * 1000,
        weekly: 6 * 24 * 60 * 60 * 1000,
        monthly: 29 * 24 * 60 * 60 * 1000,
        yearly: 364 * 24 * 60 * 60 * 1000,
      };
      const periodDuration = periodMap[project.period];

      if (!lastPaymentDate) {
        return true;
      }

      const timeDifference = currentDate - lastPaymentDate;
      const roundedTimeDifference =
        Math.floor(timeDifference / periodDuration) * periodDuration;

      return roundedTimeDifference >= periodDuration;
    });

    for (const project of filteredProjects) {
      let total = 0;

      let beneficiaries = [];
      if (project.beneficiaries) {
        beneficiaries = await User.find({
          phoneNumber: { $in: project.beneficiaries },
        });
      } else {
        beneficiaries = await User.find({ role: "user" });
      }
      console.log("beneficiaries", beneficiaries);
      total = beneficiaries.length * project.amount;
      let minFee = await getMinFee();
      minFee = await microAlgosToAlgo(minFee);
      let mbr = await getMBR(project.walletAddress);
      mbr = await microAlgosToAlgo(mbr);
      let totalAlgoNeeded = beneficiaries.length * minFee;
      totalAlgoNeeded = totalAlgoNeeded + mbr;
      let algoBalance = await getAccountBalance(project.walletAddress);
      algoBalance = await microAlgosToAlgo(algoBalance);
      let assetBalance = await getAssetBalance(
        project.walletAddress,
        USDC_ASSET_ID
      );
      console.log("assetBalance", assetBalance);
      console.log("algoBalance", algoBalance);
      console.log("total", total);
      console.log("totalAlgoNeeded", totalAlgoNeeded);

      if (algoBalance < totalAlgoNeeded || assetBalance < total) {
        const txID = await refundCreator(
          project.walletAddress,
          project.walletID,
          project.creatorAddress
        );
        if (txID) {
          await Airdrop.findByIdAndUpdate(project._id, {
            status: "completed",
          });
          await Wallets.findOneAndUpdate(project.walletID, {
            status: "available",
          });
        }
      }
    }
  } catch (error) {
    console.log("Error in getSnapshot:", error);
  }
};

const sendTokens = async () => {
  try {
    const currentDate = new Date();
    const projects = await Airdrop.find({ status: "active" });

    const filteredProjects = projects.filter((project) => {
      const lastPaymentDate = project.lastPaymentDate
        ? new Date(project.lastPaymentDate)
        : null;
      // TODO: change period map for daily back to this 23 * 60 * 60 * 1000,
      const periodMap = {
        daily: 14 * 60 * 1000,
        weekly: 6 * 24 * 60 * 60 * 1000,
        monthly: 29 * 24 * 60 * 60 * 1000,
        yearly: 364 * 24 * 60 * 60 * 1000,
      };
      const periodDuration = periodMap[project.period];

      if (!lastPaymentDate) {
        return true;
      }

      const timeDifference = currentDate - lastPaymentDate;
      const roundedTimeDifference =
        Math.floor(timeDifference / periodDuration) * periodDuration;

      return roundedTimeDifference >= periodDuration;
    });

    for (const project of filteredProjects) {
      let total = 0;
      let beneficiaries = [];
      const wallet = await Wallets.findOne({ walletID: project.walletID });

      if (project.beneficiaries) {
        beneficiaries = await User.find({
          phoneNumber: { $in: project.beneficiaries },
        });
      } else {
        beneficiaries = await User.find({ role: "user" });
      }

      const transactions = [];
      let amount = 0;

      const { amount: adjustedAmount } = await convertFractionalAssetAmount(
        USDC_ASSET_ID,
        project.amount
      );
      amount = adjustedAmount;

      for (const beneficiary of beneficiaries) {
        // Correctly format the amount in the note
        let displayAmount = (
          amount / Math.pow(10, await getAssetDecimals(USDC_ASSET_ID))
        ).toFixed(2);

        let note = `Congratulations! You've received ${displayAmount} USDC${
          amount > 1 ? "s" : ""
        } as an airdrop from ${project.organizationName}`;
        note += ` #${Date.now()}-${Math.random()}`;
        console.log("amount", amount);

        transactions.push({
          from: wallet.walletAddress,
          to: beneficiary.walletAddress,
          amount: project.amount,
          assetIndex: USDC_ASSET_ID,
          note,
        });
      }

      if (transactions.length > 0) {
        await sendGroupedAssetTransactions(transactions, wallet.walletID);
      }

      await Airdrop.findByIdAndUpdate(project._id, {
        lastPaymentDate: new Date(),
      });
    }
  } catch (error) {
    console.log("Error in sendTokens:", error);
  }
};

module.exports = {
  getSnapshot,
  sendTokens,
  getAirdrops,
  getAirdrop,
  createAirdropStep1,
  createAirdropStep2,
};
