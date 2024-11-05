const cron = require("node-cron");
const { getSnapshot, sendTokens } = require("../controllers/airdropController");
const { processAjo } = require("../controllers/ajoController");
const { processSavings } = require("../controllers/savingsController");
const { processLoans } = require("../controllers/loanController");

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
      console.log("Running process Ajo");
      await processAjo();
      console.log("process Ajo completed.");
      console.log("Running process Savings");
      await processSavings();
      console.log("process Savings completed.");
      console.log("Running process Loans");
      await processLoans();
      console.log("process Loans completed.");
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );
};

module.exports = { startCronJob };
