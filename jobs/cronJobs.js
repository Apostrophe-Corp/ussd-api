const cron = require("node-cron");
const { getSnapshot, sendTokens } = require("../controllers/airdropController");

const startCronJob = () => {
  // // Schedule a cron job to run every hour at 15 mins past the hr
  cron.schedule(
    "*/15 * * * *",
    async () => {
      try {
        console.log("Running getSnapshot...");
        await getSnapshot();
        console.log("getSnapshot completed.");
        console.log("Running sendTokens...");
        await sendTokens();
        console.log("sendTokens completed.");
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
};

module.exports = { startCronJob };
