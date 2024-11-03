const mongoose = require("mongoose");
const dotenv = require("dotenv");
const express = require("express");
const cron = require("node-cron");
const { startCronJob } = require("./jobs/cronJobs");

dotenv.config({ path: "./.env" });
const app = require("./app");

// Declare and initialize activeConnections
let activeConnections = 0;

// Connect to the database
const DB = process.env.DB_URI_PROD;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
  })
  .then(async () => {
    console.log("DB connection successful!");
    console.log("Initial documents created.");
    // Start the server once the database connection is established
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
      console.log(`App running on port ${port}...`);
      process.send("ready");
    });

    // Track active connections
    server.on("connection", (connection) => {
      activeConnections++;
      connection.on("close", () => {
        activeConnections--;
      });
    });

    // Function to handle the SIGINT and SIGTERM signals
    const gracefulShutdown = async () => {
      console.log("Server is shutting down gracefully...");
      isShuttingDown = true;

      // Stop the server from accepting new connections
      server.close(async (err) => {
        if (err) {
          console.error("Error during server close:", err);
          process.exit(1);
        }

        // Attempt to close the MongoDB connection
        try {
          await mongoose.disconnect();
          console.log("MongoDB connection closed.");
        } catch (error) {
          console.error("Error during MongoDB disconnection:", error);
        }

        // Check if there are active connections
        if (activeConnections > 0) {
          const checkConnections = setInterval(() => {
            if (activeConnections === 0) {
              clearInterval(checkConnections);
              console.log("All connections closed.");
              process.exit(0);
            }
          }, 1000); // Check every second
        } else {
          process.exit(0);
        }
      });

      // Force shutdown after a timeout if not all connections are closed
      setTimeout(() => {
        console.error("Forcing server shutdown...");
        process.exit(1);
      }, 100000); // Change the timeout value as needed
    };

    process.on("message", function (msg) {
      if (msg == "shutdown") {
        console.log("Closing all connections...");
        setTimeout(function () {
          console.log("Finished closing connections");
          process.exit(0);
        }, 10000);
      }
    });

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);

    // Call the startCronJob function to run your cron job logic when the server starts
    if (
      process.env.NODE_APP_INSTANCE === undefined ||
      process.env.NODE_APP_INSTANCE === "0"
    ) {
      startCronJob();
    }
  })
  .catch((error) => {
    console.error("DB connection error:", error);
    process.exit(1);
  });
