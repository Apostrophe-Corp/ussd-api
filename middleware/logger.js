const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

// Define stream for logging error requests
const errorLogStream = fs.createWriteStream(path.join(__dirname, "error.log"), {
  flags: "a",
});

// Define the custom logger function
function customLogger(tokens, req, res) {
  let logOutput = [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens["date"](req, res, "iso"), // Log request time in ISO format
  ];

  if (req.body && Object.keys(req.body).length > 0) {
    logOutput.push(`\nBody: ${JSON.stringify(req.body)}`);
  }

  if (req.params && Object.keys(req.params).length > 0) {
    logOutput.push(`\nParams: ${JSON.stringify(req.params)}`);
  }

  if (req.query && Object.keys(req.query).length > 0) {
    logOutput.push(`\nQuery: ${JSON.stringify(req.query)}`);
  }

  // Append response body if available and status is not successful
  if ((res.statusCode < 200 || res.statusCode >= 300) && res.__custom_body) {
    logOutput.push(`\nResponse body: ${res.__custom_body}`);
  }

  return logOutput.join(" ");
}

// Morgan middleware for error logging
const morganErrorMiddleware = morgan(customLogger, {
  stream: errorLogStream,
  skip: function (req, res) {
    // Ignore requests with the URL /api/v1/creator, including query parameters
    if (req.originalUrl.includes("creator")) {
      return true;
    }

    // Log only 400 and 500 status codes
    return res.statusCode < 400 || res.statusCode >= 600;
  },
});

module.exports = {
  morganErrorMiddleware,
};
