const Ajo = require("../models/ajoModel");
const Contribution = require("../models/contributionModel");
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

const USDC_ASSET_ID = 10458941;

const generateAjoCode = () => {
  const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

const createAjo = async (
  contributionPeriod,
  amount,
  contributorCount,
  user
) => {
  try {
    let ajoCode;
    let isCodeAvailable = false;

    // Generate a unique code for the Ajo
    while (!isCodeAvailable) {
      ajoCode = generateAjoCode();
      const existingAjo = await Ajo.findOne({
        code: ajoCode,
        status: { $in: ["active", "pending"] },
      });
      isCodeAvailable = !existingAjo;
    }

    // Create the new Ajo
    const newAjo = new Ajo({
      contributionPeriod,
      amount,
      code: ajoCode,
      contributorCount,
    });

    // Create the initial contribution for the user
    const newContribution = new Contribution({
      walletAddress: user.walletAddress,
      walletID: user.walletID,
      ajoID: newAjo._id,
      userID: user._id,
    });

    // Save the Ajo and Contribution
    await newAjo.save();
    await newContribution.save();

    // Add the user to the unpaid array
    newAjo.unpaid.push(newContribution._id);
    await newAjo.save();

    return ajoCode;
  } catch (error) {
    console.log(error);
  }
};

const joinAjo = async (ajoCode, user) => {
  try {
    // Find the pending Ajo with the given code
    const ajo = await Ajo.findOne({
      code: ajoCode,
      status: "pending",
    });

    // If no pending Ajo is found, return false
    if (!ajo) {
      return false;
    }

    // Create a new contribution for the user
    const newContribution = new Contribution({
      walletAddress: user.walletAddress,
      walletID: user.walletID,
      ajoID: ajo._id,
      userID: user._id,
    });

    // Save the new contribution
    await newContribution.save();

    // Add the contribution to the unpaid array of the Ajo
    ajo.unpaid.push(newContribution._id);
    ajo.lastPaymentDate = new Date();
    await ajo.save();

    // Check if the unpaid array length is equal to the contributorCount
    if (ajo.unpaid.length === ajo.contributorCount) {
      // Set the Ajo status to active
      ajo.status = "active";
      await ajo.save();
    }

    return true;
  } catch (error) {
    console.log(error);
  }
};

const getAdminUser = async () => {
  const adminUser = await User.findOne({ role: "admin" });
  return adminUser;
};

const processAjo = async () => {
  try {
    const currentDate = new Date();

    // Find all active Ajos
    const activeAjos = await Ajo.find({ status: "active" });

    const filteredProjects = activeAjos.filter((project) => {
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

    for (const ajo of filteredProjects) {
      // Get all contributions for this Ajo
      const contributions = await Contribution.find({ ajoID: ajo._id });
      console.log("contributions", contributions);

      // Find the first contribution in the unpaid array
      const unpaidContribution = contributions.find((c) =>
        ajo.unpaid.includes(c._id)
      );
      console.log("unpaidContribution", unpaidContribution);

      // Process payments for all other contributors
      for (const contribution of contributions) {
        if (contribution._id !== unpaidContribution._id) {
          const userBalance = await getAssetBalance(
            contribution.walletAddress,
            USDC_ASSET_ID
          );

          if (userBalance < ajo.amount) {
            // Replace the user with the admin user
            const adminUser = await getAdminUser();
            contribution.walletAddress = adminUser.walletAddress;
            contribution.walletID = adminUser.walletID;
            contribution.userID = adminUser._id;

            await transferAsset(
              adminUser.walletAddress,
              unpaidContribution.walletAddress,
              USDC_ASSET_ID,
              ajo.amount,
              adminUser.walletID,
              `Ajo ${ajo.code} payment`
            );

            // Check if the amountContributed is greater than the amountReceived
            if (contribution.amountContributed > contribution.amountReceived) {
              const excessAmount =
                contribution.amountContributed - contribution.amountReceived;
              await transferAsset(
                adminUser.walletAddress,
                contribution.walletAddress,
                USDC_ASSET_ID,
                excessAmount,
                adminUser.walletID,
                `Removal from and  refund for Ajo ${ajo.code} for not having up to necessary balance`
              );
            }
          } else {
            // Transfer the Ajo amount to the unpaid contributor
            await transferAsset(
              contribution.walletAddress,
              unpaidContribution.walletAddress,
              USDC_ASSET_ID,
              ajo.amount,
              contribution.walletID,
              `Ajo ${ajo.code} payment`
            );
          }

          // Update the contribution
          contribution.amountReceived += ajo.amount;
          await contribution.save();
        }
      }

      // Move the unpaid contribution to the paid array and update the lastPaymentDate
      ajo.unpaid.pull(unpaidContribution._id);
      ajo.paid.push(unpaidContribution._id);
      ajo.lastPaymentDate = currentDate;
      await ajo.save();

      // If the unpaid array is now empty, move all paid contributions back to unpaid
      if (ajo.unpaid.length === 0) {
        ajo.unpaid = ajo.paid.slice();
        ajo.paid = [];
        await ajo.save();
      }
      // Check if all contributions are from the admin user
      const allContributionsFromAdmin = await Contribution.find({
        ajoID: ajo._id,
        userID: { $ne: (await getAdminUser())._id },
      });

      if (allContributionsFromAdmin.length === 0) {
        // Set the Ajo status to completed
        ajo.status = "completed";
        await ajo.save();
      }
    }
  } catch (error) {
    console.log(error);
  }
};

const getAjoData = async (ajoCode) => {
  try {
    const ajo = await Ajo.findOne({ code: ajoCode, status: "pending" });
    if (!ajo) {
      return null;
    }

    return {
      membersLeft: ajo.contributorCount - ajo.unpaid.length,
      contributionAmount: ajo.amount,
      groupSize: ajo.contributorCount,
      contributionRate: ajo.contributionPeriod,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports = {
  processAjo,
  createAjo,
  joinAjo,
  getAjoData,
};
