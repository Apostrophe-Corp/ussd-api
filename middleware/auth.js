const AppError = require("../utils/appError");
const admin = require("firebase-admin");

const decodeToken = async (req, res, next) => {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer ")
  ) {
    return next(new AppError("No token provided or the token is invalid", 401));
  }

  // By this point, we know that the authorization header is present and well formatted
  const token = req.headers.authorization.split(" ")[1];
  try {
    const decodeValue = await admin.auth().verifyIdToken(token);
    if (decodeValue) {
      req.user = decodeValue;
      return next();
    }
  } catch (e) {
    console.log(e);
    // If it's a Firebase auth error, you could check for e.code to provide a more specific error message
    if (e.code && e.code == "auth/id-token-revoked") {
      // Token has been revoked. Inform the user to reauthenticate or signOut() the user.
      return next(new AppError("Token has been revoked", 401));
    } else if (e.code && e.code == "auth/id-token-expired") {
      // Token has expired. Inform the user to refresh the token or signOut() the user.
      return next(new AppError("Token has expired", 401));
    } else {
      // For other errors, you might not want to expose the error details to the client.
      return next(new AppError("Internal Server Error", 500));
    }
  }
};

module.exports = { decodeToken };
