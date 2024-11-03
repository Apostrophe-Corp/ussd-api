const express = require("express");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const compression = require("compression");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const { morganErrorMiddleware } = require("./middleware/logger");
const { isValidEndpoint } = require("./utils/utils");
const TestRouter = require("./routes/testRouter");

const app = express();

app.enable("trust proxy");

app.set("view engine", "ejs");

// Set up CORS
app.use(
  cors({
    origin: ["https://www.viewreward.app"],
    credentials: true,
  })
);

// Handle preflight requests
app.options("*", cors());

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());
app.use(cookieParser());

app.set("trust proxy", 1);
app.get("/api/v1/ip", (request, response) => {
  response.send(request.ip);
});

// Body parser, reading data from body into req.body
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ["id", "status", "advertSpot", "projectName", "assetID"],
  })
);

const validEndpoints = ["/api/v1/test"];

const validateEndpoint = (req, res, next) => {
  const requestedEndpoint = req.path;

  // Check if the requested endpoint is valid
  if (!isValidEndpoint(requestedEndpoint, validEndpoints)) {
    // If not valid, block the IP address
    res.status(403).send("Forbidden");
  } else {
    // If valid, proceed to the next middleware
    next();
  }
};

app.use(validateEndpoint);

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.use(morganErrorMiddleware);

// 3) ROUTES
app.use("/api/v1", TestRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
