const express = require("express");
const router = express.Router();
const {
  createUser,
  getUserBalance,
  transfer,
  checkUserExists,
} = require("../controllers/userController");
const { showAsCurrency } = require("../utils/showAsCurrency");
const { trimOverkill } = require("../utils/trimOverkill");

router.route("/ussd").post(async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  console.log(sessionId, serviceCode, phoneNumber, text);

  let response = "";

  const textArray = text.split("*").filter((e) => e);
  const level = textArray.length;
  const lastInput = textArray[level - 1];
  const isLvl = (lvl) => level === lvl;
  const sac = (amount) =>
    showAsCurrency({
      val: amount,
      digits: 2,
      depth: 1e18,
      blankDecimals: true,
    });

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
        default:
          break;
      }
    } else {
      // Existing user - show main menu and handle options
      switch (level) {
        case 0:
          // Main menu
          response = `CON Welcome back! Main Menu:
          1. Check Balance
          2. Transfer
          3. Withdraw
          4. Start Ajo
          5. Join Ajo
          6. Save
          7. Borrow
          8. Change Pin`;
          break;
        default:
          switch (textArray[0]) {
            case "1":
              // Check Balance
              const checkBalance = await getUserBalance(phoneNumber);
              response = `END Your balance is ${sac(checkBalance)} USD.`;
              break;

            case "2":
              // Transfer flow
              if (isLvl(1)) {
                response = "CON Enter the phone number of the recipient:";
              } else if (isLvl(2)) {
                const recipientPhone = lastInput;
                const recipientUser = await checkUserExists(recipientPhone);

                if (recipientUser) {
                  response = `CON Recipient found: ${recipientUser.username}
                  Is this the correct recipient?
                  1. Yes
                  2. No`;
                } else {
                  response =
                    "END Recipient not found. Please check the phone number and try again.";
                }
              } else if (isLvl(3)) {
                const confirmation = lastInput;
                if (confirmation === "1") {
                  const balance = await getUserBalance(phoneNumber);
                  response = `CON Enter the amount you want to transfer (Your Balance: ${sac(balance)} USD):`;
                } else if (confirmation === "2") {
                  response =
                    "END Transfer cancelled. Please try again with the correct phone number.";
                } else {
                  response = "END Invalid choice. Please try again.";
                }
              } else if (isLvl(4)) {
                const amount = trimOverkill(Number(lastInput), 2);
                if (isNaN(amount)) {
                  response = "END Please enter a valid amount.";
                } else {
                  const balance = await getUserBalance(phoneNumber);
                  if (balance >= amount) {
                    response =
                      "CON Please enter your 4-digit PIN to confirm the transfer:";
                  } else {
                    response = `END Insufficient funds. Your balance is ${sac(balance)} USD.`;
                  }
                }
              } else if (isLvl(5)) {
                const pin = lastInput;
                if (pin === user.pin) {
                  try {
                    const recipientPhone = textArray[1];
                    const amount = Number(textArray[3]);

                    // Execute transfer
                    await transfer(phoneNumber, recipientPhone, amount);

                    // Get updated balance
                    const newBalance = await getUserBalance(phoneNumber);

                    response = `END Transfer successful! 
                    Amount: ${sac(amount)} USD
                    Current balance: ${sac(newBalance)} USD`;
                  } catch (error) {
                    console.error("Transfer error:", error);
                    response = "END Transfer failed. Please try again later.";
                  }
                } else {
                  response = "END Incorrect PIN. Please try again.";
                }
              }
              break;

            case "3":
              // Withdraw - Ask for vendor's ID
              if (isLvl(1)) {
                response = "CON Enter the Vendor's ID number:";
              } else if (isLvl(2)) {
                const venderID = lastInput;
                const vIDIsValid = true;
                if (vIDIsValid) {
                  const balance = 0;
                  response = `CON Enter the amount you want to withdraw (Your Balance: ${sac(balance)} USD):`;
                } else {
                  response =
                    "END The Vendor ID entered seems to be incorrect, please ensure you have the correct ID from the Vendor.";
                }
              } else if (isLvl(3)) {
                const amount = trimOverkill(Number(lastInput), 2);
                if (isNaN(amount)) {
                  response = `END The amount entered isn't a valid numerical value. Let's try again shall we.`;
                } else {
                  const balance = 0;
                  const balanceIsSufficient = true;
                  if (balanceIsSufficient) {
                    response = `CON Please enter you PIN to confirm this withdrawal:`;
                  } else {
                    response = `END Your balance: ${sac(balance)} USD, is insufficient to carry out a withdrawal of: ${sac(amount)} USD.`;
                  }
                }
              } else if (isLvl(4)) {
                const pin = lastInput;
                const pinIsValid = true;
                if (pinIsValid) {
                  try {
                    const withdrawalCode = 0;
                    const amount = sac(Number(textArray[2]));
                    response = `END Withdrawal request for ${amount} USD successfully placed!
                    - Here is your withdrawal code:
                    - ${withdrawalCode}
                    - Give that to the Vendor to complete your withdrawal.`;
                  } catch (error) {
                    response = `END Sorry we're unable to complete this withdrawal at this time.`;
                  }
                } else {
                  response = `END The PIN entered is incorrect.`;
                }
              }
              break;

            case "4":
              // Create Ajo - Ask for frequency
              if (isLvl(1)) {
                response = `CON Setup contribution rate:
                1. Monthly
                2. Weekly`;
              } else if (isLvl(2)) {
                const contributionRate = lastInput;
                if (contributionRate !== "1" || contributionRate !== "2") {
                  response = `END Invalid response.`;
                } else {
                  response = `CON How many people would be in this Ajo group? (Must be more than 1)`;
                }
              } else if (isLvl(3)) {
                const groupSize = lastInput;
                if (isNaN(groupSize) || Number(groupSize) <= 1) {
                  response = `END Invalid response.`;
                } else {
                  response = `CON How much is each member required to contribute? (In USD)`;
                }
              } else if (isLvl(4)) {
                const amount = trimOverkill(Number(lastInput));
                if (isNaN(amount)) {
                  response = `END The amount entered isn't a valid numerical value. Let's try again shall we.`;
                } else {
                  try {
                    const ajoID = 0;
                    response = `END Ajo group successfully created!
                    - Please save and share this Ajo ID to have others join you Ajo group:
                    - ${ajoID}`;
                  } catch (error) {
                    response = `END Sorry we're unable to complete this Ajo set-up at this time.`;
                  }
                }
              }
              break;

            case "5":
              // Join Ajo - Ask for ID
              if (isLvl(1)) {
                response = "CON Enter the Ajo ID you want to join:";
              } else if (isLvl(2)) {
                const ajoID = lastInput;
                const ajoIDExists = true;
                if (ajoIDExists) {
                  const ajoData = {};
                  const {
                    membersLeft = 0,
                    contributionAmount = 0,
                    groupSize = 0,
                    contributionRate = "montly",
                  } = ajoData;
                  response = `CON This is a ${contributionRate} ${groupSize}-person Ajo group with ${groupSize - membersLeft} open slots. Would you like to join this Ajo group?
                  1. Yes
                  2. No`;
                } else {
                  response = `END This Ajo ID seems incorrect. Please ensure you have the correct Ajo ID.`;
                }
              } else if (isLvl(3)) {
                const userChoice = lastInput;
                if (userChoice === "1") {
                  response = `CON Please enter your PIN to confirm this action:`;
                } else if (userChoice === "2") {
                  response = `END Process aborted.`;
                } else {
                  response = `END Invalid response.`;
                }
              } else if (isLvl(4)) {
                const pin = lastInput;
                const pinIsValid = true;
                if (pinIsValid) {
                  try {
                    response = `END You've been added to the Ajo group.`;
                  } catch (error) {
                    response = `END Sorry we're unable to add you to the Ajo group at this time.`;
                  }
                } else {
                  response = `END The PIN entered is incorrect.`;
                }
              }
              break;

            case "6":
              // Save - Ask for amount
              if (isLvl(1)) {
                const interestRate = 0;
                response = `CON Enter the amount you want to save (+${interestRate}% Interest Yearly):`;
              } else if (isLvl(2)) {
                const amount = trimOverkill(Number(lastInput), 2);
                if (isNaN(amount)) {
                  response = `END The amount entered isn't a valid numerical value. Let's try again shall we.`;
                }
                const balance = 0;
                const balanceIsSufficient = true;
                if (balanceIsSufficient) {
                  response = `CON How long would you like to save this amount for?
                  1. 1 Week
                  2. 2 Weeks
                  3. 3 Weeks
                  4. 1 Month
                  5. 2 Months
                  6. 3 Months
                  7. 6 Months
                  8. 1 Year`;
                } else {
                  response = `END Your balance: ${sac(balance)} USD, is insufficient to charge this amount: ${sac(amount)} USD.`;
                }
              } else if (isLvl(3)) {
                const validators = {
                  1: true,
                  2: true,
                  3: true,
                  4: true,
                  5: true,
                  6: true,
                  7: true,
                  8: true,
                };
                if (!validators[lastInput]) {
                  response = "END Invalid response";
                } else {
                  const durations = {
                    1: 7,
                    2: 14,
                    3: 21,
                    4: 30,
                    5: 60,
                    6: 90,
                    7: 180,
                    8: 365,
                  };
                  const days = durations[lastInput];
                  response = `CON Please enter your PIN to complete this action:`;
                }
              } else if (isLvl(4)) {
                const pin = lastInput;
                const pinIsValid = true;
                if (pinIsValid) {
                  try {
                    response = `END Your savings have been secured.`;
                  } catch (error) {
                    response = `END Sorry we're unable to complete this action at this time.`;
                  }
                } else {
                  response = `END The PIN entered is incorrect.`;
                }
              }
              break;

            case "7":
              // Borrow - Ask for amount
              const eligibleAmount = 0;
              if (isLvl(1)) {
                if (eligibleAmount)
                  response = `CON Enter the amount you want to borrow (Up to ${eligibleAmount} USD):`;
                else response = `END You are not eligible for this service.`;
              } else if (isLvl(2)) {
                const amount = trimOverkill(Number(lastInput), 2);
                if (isNaN(amount)) {
                  response = `END The amount entered isn't a valid numerical value. Let's try again shall we.`;
                }
                const balance = 0;
                const isEligibleForAmount =
                  trimOverkill(eligibleAmount, 2) >= amount;
                if (isEligibleForAmount) {
                  response = `CON Please enter your PIN to complete this action:`;
                } else {
                  response = `END Your eligible amount: ${sac(balance)} USD, is insufficient to request: ${sac(amount)} USD.`;
                }
              } else if (isLvl(3)) {
                const pin = lastInput;
                const pinIsValid = true;
                if (pinIsValid) {
                  try {
                    response = `END You have been credited with ${sac(Number(textArray[1]))} USD.`;
                  } catch (error) {
                    response = `END Sorry we're unable to complete this action at this time.`;
                  }
                } else {
                  response = `END The PIN entered is incorrect.`;
                }
              }
              break;

            case "8":
              // Change Pin - Ask for old PIN
              if (isLvl(1)) {
                response = "CON Enter your current PIN:";
              } else if (isLvl(2)) {
                const pin = lastInput;
                const pinIsValid = true;
                if (pinIsValid) {
                  response = "CON Enter your new 4-digit PIN:";
                } else {
                  response = `END The PIN entered is incorrect.`;
                }
              } else if (isLvl(3)) {
                const pin = lastInput;
                const previousPin = textArray[1];
                const pinIsValid =
                  pin !== previousPin && !isNaN(pin) && pin.length === 4;
                if (pinIsValid) {
                  try {
                    response = `END Your PIN has been updated.`;
                  } catch (error) {
                    response = `END Sorry we're unable to update your PIN at this time.`;
                  }
                } else {
                  response =
                    pin === previousPin
                      ? `END The new PIN must be different from the previous one.`
                      : isNaN(pin) || pin.length > 4
                        ? `END The new PIN must be a 4-digit PIN`
                        : `END The PIN entered is incompatible for the update`;
                }
              }
              break;

            default:
              response = "END Invalid response.";
              break;
          }
          break;
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
