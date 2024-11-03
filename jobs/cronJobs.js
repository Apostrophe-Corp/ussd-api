const cron = require("node-cron");
const Vaults = require("../models/vaultsModel");
const {
  endAirdrop,
  reclaimPendingWallets,
  updateGeneralMetrics,
  cleanupRateLimitData,
  searchForSuspiciousWallets,
} = require("../controllers/airDropController");
const {
  getSnapshotNfd,
  sendTokensNfd,
  cleanInactivePoolsNfd,
  refundFailedNfdJobs,
} = require("../controllers/nfdController");
const {
  removeOldUsedTickets,
  cleanInactiveVaults,
  updateVaultsStatus,
} = require("../controllers/vaultsController");
const { updateAndEndAdverts } = require("../controllers/advertController");
const {
  updateAirdropMetrics,
  updateUserMetrics,
  updateNftAirdropMetrics,
} = require("../controllers/metricsController");
const {
  findAndDeleteUsersWithEmptyMetrics,
} = require("../controllers/userController");
const {
  getSnapshot,
  sendTokens,
  refundInactiveProject,
  handleFailedSoftStaking,
} = require("../controllers/tokenSoftStakingController");
const {
  getSnapshotNft,
  sendTokensNft,
  refundInactiveProjectNft,
  handleFailedNftSoftStaking,
} = require("../controllers/nftSoftStakingController");
const {
  sendTokensVip,
  refundInactiveProjectVip,
  getSnapshotVip,
  handleFailedKeyPools,
} = require("../controllers/keyPoolsController");
const {
  endAirdropNft,
  handleFailedAirdropsNft,
} = require("../controllers/nftAirdropsController");

const startCronJob = () => {
  // Schedule a cron job to run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    await Vaults.updateMany(
      {},
      { $pull: { reservedAssets: { reservedAt: { $lt: cutoffTime } } } }
    );
  });

  // Schedule a cron job to run every hour at 15 mins past the hr
  cron.schedule(
    "35 * * * *",
    async () => {
      try {
        await endAirdrop();
        await endAirdropNft();
        await reclaimPendingWallets();
        await updateAndEndAdverts();
        await findAndDeleteUsersWithEmptyMetrics();
        await updateAirdropMetrics();
        await updateGeneralMetrics();
        await updateUserMetrics();
        await cleanupRateLimitData();
        await removeOldUsedTickets();
        await handleFailedSoftStaking();
        await handleFailedNftSoftStaking();
        await handleFailedKeyPools();
        await handleFailedAirdropsNft();
        await updateNftAirdropMetrics();
        await cleanInactivePoolsNfd();
        await refundFailedNfdJobs();
      } catch (error) {
        console.error("Cron job error:", error);
      }
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );

  // Schedule getSnapshot at 10:00 PM
  cron.schedule("0 22 * * *", async () => {
    console.log("Running getSnapshot...");
    await getSnapshot();
    console.log("getSnapshot completed.");

    // After getSnapshot completes, run sendTokens
    console.log("Running sendTokens...");
    await sendTokens();
    console.log("sendTokens completed.");
  });

  // schedule for 5pm
  // "0 17 * * *";
  cron.schedule("0 17 * * *", async () => {
    console.log("Running getSnapshotNFD...");
    await getSnapshotNfd();
    console.log("getSnapshotNFD completed.");

    // After getSnapshot completes, run sendTokens
    console.log("Running sendTokensNFD...");
    await sendTokensNfd();
    console.log("sendTokensNFD completed.");
  });

  // Schedule getSnapshotNft at 8:00 PM
  cron.schedule("0 20 * * *", async () => {
    console.log("Running getSnapshotNft...");
    await getSnapshotNft();
    console.log("getSnapshotNft completed.");

    // After getSnapshotNft completes, run sendTokensNft
    console.log("Running sendTokensNft...");
    await sendTokensNft();
    console.log("sendTokensNft completed.");
  });

  // Schedule getSnapshotVip at 6:00 PM
  cron.schedule("0 18 * * *", async () => {
    console.log("Running getSnapshotVip...");
    await getSnapshotVip();
    console.log("getSnapshotVip completed.");

    // After getSnapshotVip completes, run sendTokensVip
    console.log("Running sendTokensVip...");
    await sendTokensVip();
    console.log("sendTokensVip completed.");
  });

  // refundInactiveProject: Runs at 1:00 AM on Sundays and Thursdays
  cron.schedule("0 1 * * 0,4", async () => {
    console.log("Running refundInactiveProject...");
    await refundInactiveProject();
    await cleanInactiveVaults();
    console.log("refundInactiveProject completed.");
  });

  // refundInactiveProjectNft: Runs at 2:00 AM on Sundays and Thursdays
  cron.schedule("0 2 * * 0,4", async () => {
    console.log("Running refundInactiveProjectNft...");
    await refundInactiveProjectNft();
    console.log("refundInactiveProjectNft completed.");
  });

  // refundInactiveProjectVip: Runs at 3:00 AM on Sundays and Thursdays
  cron.schedule("0 3 * * 0,4", async () => {
    console.log("Running refundInactiveProjectVip...");
    await refundInactiveProjectVip();
    console.log("refundInactiveProjectVip completed.");
  });

  // searchForSuspiciousWallets: Runs at 12:30 PM every day
  cron.schedule("30 12 * * *", async () => {
    await searchForSuspiciousWallets();
    await updateVaultsStatus();
  });
};

module.exports = { startCronJob };
