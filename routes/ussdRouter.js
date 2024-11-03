const express = require("express");
const router = express.Router();
const {
  createUser,
  getUserBalance,
  transfer,
  checkUserExists,
} = require("../controllers/userController");

router.route("/ussd").post(async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  console.log(sessionId, serviceCode, phoneNumber, text);
  let response = "";

  const textArray = text.split("*");
  const level = textArray.length;

  try {
    const user = await checkUserExists(phoneNumber);

    if (!user) {
      // New user registration flow
      switch (level) {
        case 1:
          if (text === "") {
            response =
              "CON Welcome new user. Please enter a username to create an account:";
          } else {
            response = "CON Please enter a 4-digit PIN:";
          }
          break;
        case 2:
          response = "CON Please confirm your 4-digit PIN:";
          break;
        case 3:
          const [username, pin, confirmPin] = textArray;
          if (pin !== confirmPin) {
            response = "END PINs do not match. Please try again.";
          } else {
            try {
              await createUser(username, phoneNumber, pin);
              response =
                "END Account created successfully. Please dial the code again to access the main menu.";
            } catch (error) {
              console.error("Error creating user:", error);
              response =
                "END An error occurred while creating your account. Please try again later.";
            }
          }
          break;
      }
    } else {
      // Existing user - show main menu and handle options
      switch (level) {
        case 1:
          // Main menu
          response =
            "CON Welcome back! Main Menu:\n" +
            "1. Check Balance\n2. Transfer\n3. Withdraw\n" +
            "4. Create Ajo\n5. Join Ajo\n6. Save\n" +
            "7. Borrow\n8. Change Pin";
          break;

        case 2:
          switch (textArray[1]) {
            case "1":
              // Check account balance
              // TODO: Implement balance checking logic
              response = "END Your balance is: [Balance]";
              break;

            case "2":
              // Transfer - Ask for recipient's phone number
              response = "CON Enter the phone number of the recipient:";
              break;

            case "3":
              // Withdraw - Ask for vendor's ID
              response = "CON Enter the vendor's ID number:";
              break;

            case "4":
              // Create Ajo - Ask for frequency
              response = "CON Select Ajo frequency:\n1. Monthly\n2. Weekly";
              break;

            case "5":
              // Join Ajo - Ask for ID
              response = "CON Enter the Ajo ID you want to join:";
              break;

            case "6":
              // Save - Ask for amount
              response = "CON Enter the amount you want to save:";
              break;

            case "7":
              // Borrow - Ask for amount
              response = "CON Enter the amount you want to borrow:";
              break;

            case "8":
              // Change Pin - Ask for old PIN
              response = "CON Enter your current PIN:";
              break;

            default:
              response = "END Invalid option. Please try again.";
          }
          break;

        // Add more cases for subsequent levels of each option
        case 3:
          // Handle third level of menu options
          // You'll need to implement the logic for each option here
          break;

        case 4:
          // Handle fourth level of menu options
          break;

        // Add more cases as needed

        default:
          response = "END Invalid option. Please try again.";
      }
    }
  } catch (error) {
    console.error("Error in USSD route:", error);
    response = "END An error occurred. Please try again later.";
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
});

module.exports = router;
