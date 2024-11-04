const algosdk = require("algosdk");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
const Bottleneck = require("bottleneck");
const User = require("../models/userModel");

dotenv.config({ path: "./.env" });

const network = "testnet";
const algodServer = `https://${network}-api.algonode.cloud`;
const indexerServer = `https://${network}-idx.algonode.cloud`;
// Base URL for the NF Domains API on testnet
// const NFD_API_BASE_URL = `https://api.${network}.nf.domains`;
const NFD_API_BASE_URL = `https://api.nf.domains`;

port = 443;
token = "";

const algodClient = new algosdk.Algodv2(token, algodServer, port);

const idxClient = new algosdk.Indexer(token, indexerServer, port);

const minFee = algosdk.ALGORAND_MIN_TX_FEE;

const limiter = new Bottleneck({
  minTime: 200, // Roughly 300 calls per minute
});

const algodLimiter = new Bottleneck({
  minTime: 10, // Limit to 100 transactions per second
});

const convertFractionalAssetAmount = async (assetId, amount, knownDecimals) => {
  const decimals =
    knownDecimals !== undefined
      ? knownDecimals
      : await algodClient
          .getAssetByID(assetId)
          .do()
          .then((res) => res.params.decimals);

  const adjustedAmount = Math.floor(amount * Math.pow(10, decimals));
  return { amount: adjustedAmount, decimals };
};

const getAssetDecimals = async (assetId) => {
  const assetInfo = await algodClient.getAssetByID(assetId).do();
  return assetInfo.params.decimals;
};

const getAccount = async (key) => {
  try {
    const account = algosdk.mnemonicToSecretKey(key);
    return account;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
const getAccountInfo = async (address) => {
  try {
    const accountInfo = await algodClient.accountInformation(address).do();
    return accountInfo;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getAssetInfo = async (assetIndex) => {
  try {
    const assetInfo = await idxClient.lookupAssetByID(assetIndex).do();
    return assetInfo;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const parseCurrency = async (tok, amt) => {
  const assetInfo = await getAssetInfo(tok);
  const temp = assetInfo.asset.params.decimals;
  const decimals = temp ? temp : 0;
  const power = 10 ** Number(decimals);
  const newAmt = amt * power;
  const secondHalf = String(newAmt % 1).length - 2;
  if (secondHalf) {
    return Math.floor(newAmt);
  }
  return Number(newAmt);
};

const fmtCurrency = async (tok, microAmt) => {
  try {
    const assetInfo = await getAssetInfo(tok);
    const temp = assetInfo.asset.params.decimals;
    const decimals = temp ? temp : 0;
    const power = 10 ** Number(decimals);
    const algoAmt = microAmt / power;
    return algoAmt;
  } catch (error) {
    console.error("Error converting microAmt to Algo:", error);
    throw error;
  }
};

const transferAlgo = async (fromAddress, toAddress, amount, key, note) => {
  try {
    const account = await getAccount(key);
    const suggestedParams = await algodClient.getTransactionParams().do();

    const txnParams = {
      from: fromAddress,
      to: toAddress,
      amount: Math.round(amount), // Ensure the amount is rounded to the nearest integer
      suggestedParams: suggestedParams,
    };

    // Add a unique identifier to the note

    const uniqueNote = `${note} | #${Date.now()}-${Math.random()}`;
    if (uniqueNote) {
      txnParams["note"] = new Uint8Array(Buffer.from(uniqueNote, "utf8"));
    }

    const ptxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject(txnParams);
    const signedTxn = ptxn.signTxn(account.sk);
    await algodClient.sendRawTransaction(signedTxn).do();
    let txId = ptxn.txID().toString();
    await algosdk.waitForConfirmation(algodClient, txId, 4); // Use a shorter wait time
    return txId;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const createAccount = () => {
  try {
    const account = algosdk.generateAccount();
    const address = account.addr;
    const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
    return { address, mnemonic };
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const optIn = async (address, assetId, key) => {
  try {
    const account = await getAccount(key);
    const suggestedParams = await algodClient.getTransactionParams().do();
    const opInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: address,
      to: address,
      assetIndex: assetId,
      suggestedParams,
      amount: 0,
    });
    const signedTxn = opInTxn.signTxn(account.sk);
    await algodClient.sendRawTransaction(signedTxn).do();
    let txId = opInTxn.txID().toString();
    const result = await algosdk.waitForConfirmation(algodClient, txId, 8);
    return txId;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

//from address is address that wants to opt out
//to address is beavers address
const optOut = async (fromAddress, assetId, key) => {
  try {
    // Get the current balance of the asset in the wallet
    const assetBalance = await getAssetBalance(fromAddress, assetId);

    // Check if the balance is not 0
    if (assetBalance !== 0) {
      console.log(`Cannot opt out. Asset balance (${assetBalance}) is not 0.`);
      return false; // Return falsy value to indicate opt-out refusal
    }

    // Proceed with the opt-out transaction
    const account = await getAccount(key);
    const assetInfo = await getAssetInfo(assetId);
    const creator = assetInfo.asset.params.creator;
    const suggestedParams = await algodClient.getTransactionParams().do();
    const opOutTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: fromAddress,
      to: creator,
      assetIndex: assetId,
      suggestedParams,
      closeRemainderTo: creator,
    });
    const signedTxn = opOutTxn.signTxn(account.sk);
    await algodClient.sendRawTransaction(signedTxn).do();
    let txId = opOutTxn.txID().toString();
    const result = await algosdk.waitForConfirmation(algodClient, txId, 4);
    return txId;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getAccountBalance = async (address) => {
  try {
    const account = await algodClient.accountInformation(address).do();

    return account["amount"];
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const microAlgosToAlgo = (microAlgos) => {
  return microAlgos / 1e6;
};

const algoToMicroAlgos = (algo) => {
  return algo * 1e6;
};

// Function to create a new asset (token)
const createToken = async (
  creatorAccount,
  key,
  tokenName,
  unitName,
  totalTokens,
  decimals
) => {
  try {
    const account = await getAccount(key);
    // Create an asset configuration transaction
    const params = await algodClient.getTransactionParams().do();
    const assetConfigTxn =
      algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        from: creatorAccount,
        total: totalTokens,
        decimals: 2,
        assetName: tokenName,
        unitName: unitName,
        assetURL: undefined,
        assetMetedataHash: undefined,
        defaultFrozen: false,
        freeze: undefined,
        manager: undefined,
        clawback: undefined,
        reserve: undefined,
        note: undefined,
        suggestedParams: params,
      });

    // Sign the transaction
    const signedTxn = assetConfigTxn.signTxn(account.sk);
    const txId = assetConfigTxn.txID().toString();
    // Submit the transaction to the network
    const tx = await algodClient.sendRawTransaction(signedTxn).do();

    const confirmedTxn = await algosdk.waitForConfirmation(
      algodClient,
      txId,
      8
    );
    const ptx = await algodClient.pendingTransactionInformation(tx.txId).do();
    const assetID = ptx["asset-index"];
    // Get the completed Transaction

    return assetID;
  } catch (error) {
    console.error("Error creating token:", error);
    throw error;
  }
};

const getTransactionInfo = async (transactionId) => {
  try {
    const transactionInfo = await idxClient
      .searchForTransactions()
      .txid(transactionId)
      .do();
    return transactionInfo;
  } catch (error) {
    console.error("Error fetching transaction information:", error);
    return error;
  }
};

const getWalletsToBlacklist = async (receiverAddress, timePeriodInDays) => {
  // Calculate start time based on the provided time period
  const currentTime = Math.floor(Date.now() / 1000);
  const startTime = currentTime - timePeriodInDays * 24 * 60 * 60;

  // Get transaction information for the specified wallet address
  const transactions = await idxClient
    .searchForTransactions()
    .address(receiverAddress)
    .do();

  // Filter transactions within the specified time period
  const filteredTransactions = transactions.transactions.filter(
    (transaction) =>
      transaction["round-time"] >= startTime &&
      transaction["round-time"] <= currentTime
  );

  // Extract sender wallet addresses from filtered transactions
  const senderAddresses = filteredTransactions.map(
    (transaction) => transaction.sender
  );

  // Remove duplicate addresses
  const uniqueSenderAddresses = [...new Set(senderAddresses)];

  return uniqueSenderAddresses;
};

const getTransactionsForWallet = async (address, timePeriodInDays) => {
  try {
    // Calculate start time based on the provided time period
    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = currentTime - timePeriodInDays * 24 * 60 * 60;

    // Get transaction information for the specified wallet address
    const transactions = await idxClient
      .searchForTransactions()
      .address(address)
      .do();

    // Filter transactions within the specified time period and transaction type (asset transfer or Algo transaction)
    const filteredTransactions = transactions.transactions.filter(
      (transaction) =>
        transaction["round-time"] >= startTime &&
        transaction["round-time"] <= currentTime &&
        (transaction["tx-type"] === "pay" || transaction["tx-type"] === "axfer") // Filter for asset transfers and Algo transactions
    );

    // Extract receiver wallet addresses from filtered transactions
    const receiverAddresses = filteredTransactions
      .map((transaction) => {
        if (
          transaction["payment-transaction"] &&
          transaction["payment-transaction"].receiver
        ) {
          return transaction["payment-transaction"].receiver;
        } else if (
          transaction["asset-transfer-transaction"] &&
          transaction["asset-transfer-transaction"].receiver
        ) {
          return transaction["asset-transfer-transaction"].receiver;
        }
        // Add other conditions based on your transaction types
        return undefined;
      })
      .filter((receiver) => receiver !== undefined); // Filter out undefined values

    // Remove duplicate addresses
    const uniqueReceiverAddresses = [...new Set(receiverAddresses)];

    return uniqueReceiverAddresses;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
};

const checkForSuspiciousAddresses = async (
  userAddresses,
  trustedWallets,
  timePeriodInDays
) => {
  try {
    // Array to store suspicious addresses as objects
    const suspiciousAddresses = [];

    // Iterate through each user address
    for (const userAddress of userAddresses) {
      // Fetch transactions for the user address
      const receiverAddresses = await getTransactionsForWallet(
        userAddress,
        timePeriodInDays
      );

      // Update the count for each receiver address
      receiverAddresses.forEach((receiverWallet) => {
        const existingSuspiciousAddress = suspiciousAddresses.find(
          (suspicious) => suspicious.address === receiverWallet
        );

        if (existingSuspiciousAddress) {
          existingSuspiciousAddress.senderCount++;
        } else {
          const newSuspiciousAddress = {
            address: receiverWallet,
            senderCount: 1,
          };
          suspiciousAddresses.push(newSuspiciousAddress);
        }
      });
    }

    // Filter suspicious addresses with counts more than 5 and not in the list of trusted addresses
    const filteredSuspiciousAddresses = suspiciousAddresses.filter(
      (suspiciousAddress) =>
        suspiciousAddress.senderCount > 9 &&
        !trustedWallets.includes(suspiciousAddress.address)
    );
    return filteredSuspiciousAddresses;
  } catch (error) {
    console.error("Error processing user addresses:", error);
    return [];
  }
};

async function getFirstFundingTransaction(walletAddress) {
  const transactionInfo = await idxClient
    .searchForTransactions()
    .address(walletAddress)
    .do();
  const transactions = transactionInfo["transactions"];
  if (!transactions || transactions.length === 0) {
    return null;
  }

  // Assuming transactions are sorted in reverse chronological order (newest first)
  // Check if the transaction is a payment and the wallet is the receiver
  if (transactions.length > 0) {
    const transaction = transactions[transactions.length - 1];
    // Found the first transaction where the wallet is the receiver
    if (transaction?.sender || transaction?.id) {
      return {
        senderAddress: transaction.sender,
        receiverAddress: walletAddress,
        transactionId: transaction.id,
      };
    }
  } else {
    // No funding transaction found
    return null;
  }
}

async function isFundedByBlacklistedWallet(walletAddress) {
  try {
    const firstTransaction = await getFirstFundingTransaction(walletAddress);
    if (!firstTransaction) {
      return false; // Wallet has not been funded
    }

    if (!firstTransaction?.senderAddress) {
      return false; // No sender address found
    }

    const senderAddress = firstTransaction.senderAddress;

    // Check if the sender's address is blacklisted as a user
    const blacklistedUser = await User.findOne({
      address: senderAddress,
      isBlacklisted: true,
    });
    if (blacklistedUser) {
      return true; // Funded by blacklisted user
    }

    // Check if the sender's address is in the blacklisted wallets collection
    const blacklistedEntry = await BlacklistedWallets.findOne({
      receivingAddress: senderAddress,
      status: "blacklisted",
    });
    if (blacklistedEntry) {
      return true; // Funded by a wallet in the blacklisted wallets collection
    }

    // Wallet not funded by any blacklisted addresses
    return false;
  } catch (error) {
    console.error("Error checking for blacklisted funding:", error);
    throw error;
  }
}

const getMBR = async (address) => {
  try {
    const info = await algodClient.accountInformation(address).do();
    const minBalance = info["min-balance"];
    return minBalance;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getMinFee = async () => {
  const suggestedParams = await algodClient.getTransactionParams().do();
  return suggestedParams.minFee;
};

const findMatchingAssets = async (address, assetIds) => {
  try {
    let assets = [];
    let nextToken = "";
    do {
      const response = await idxClient
        .lookupAccountAssets(address)
        .nextToken(nextToken)
        .do();
      assets = assets.concat(response["assets"]);
      nextToken = response["next-token"];
    } while (nextToken);

    // Filter to find all matching asset IDs that are still held by the account
    const matchingAssets = assets
      .filter(
        (asset) => assetIds.includes(asset["asset-id"]) && asset["amount"] > 0
      )
      .map((asset) => asset["asset-id"]); // Map the filtered assets to their IDs

    // Return the array of matching asset IDs, or an empty array if no matches found
    return matchingAssets.length > 0 ? matchingAssets : [];
  } catch (error) {
    return [];
  }
};

async function checkIfOptedIn(address, assetId) {
  try {
    // Search for the account's assets
    let assets = [];
    let nextToken = "";
    do {
      const response = await idxClient
        .lookupAccountAssets(address)
        .nextToken(nextToken)
        .do();
      assets = assets.concat(response["assets"]);
      nextToken = response["next-token"];
    } while (nextToken);

    // Check if the asset is present in the account's assets
    const asset = assets.find((asset) => asset["asset-id"] == assetId);
    let optedIn = asset ? true : false;

    return optedIn;
  } catch (error) {
    console.error("Error checking opt-in status with Indexer:", error);
    return false;
  }
}

const getAssetBalance = async (address, assetId) => {
  try {
    let assets = [];
    let nextToken = "";
    do {
      const response = await idxClient
        .lookupAccountAssets(address)
        .nextToken(nextToken)
        .do();
      assets = assets.concat(response["assets"]);
      nextToken = response["next-token"];
    } while (nextToken);

    const asset = assets.find((asset) => asset["asset-id"] == assetId);
    const amount = asset ? asset["amount"] : 0;
    const fmtAmount = await fmtCurrency(assetId, amount);
    return fmtAmount;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

async function groupOptInTransactions(asaIds, address, key) {
  console.time("groupOptInTransactions"); // Start measuring execution time
  try {
    const account = await getAccount(key);
    const suggestedParams = await algodClient.getTransactionParams().do();
    const batchSize = 16; // Maximum transactions per group
    const waitRoundsToConfirm = 4; // Reduce confirmation rounds to optimize speed

    // Helper function to handle transaction batch processing
    const processBatch = async (batchIds) => {
      const optInTxns = batchIds.map((assetId) =>
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: address,
          to: address,
          amount: 0,
          assetIndex: assetId,
          suggestedParams,
        })
      );

      algosdk.assignGroupID(optInTxns);

      const signedTxns = await Promise.all(
        optInTxns.map((txn) => txn.signTxn(account.sk))
      );

      const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
      await algosdk.waitForConfirmation(algodClient, txId, waitRoundsToConfirm);

      return txId;
    };

    // Split asaIds into batches and process concurrently
    const txIds = [];
    const batches = [];
    for (let i = 0; i < asaIds.length; i += batchSize) {
      const batchIds = asaIds.slice(i, i + batchSize);
      batches.push(processBatch(batchIds));

      // Delay to manage AlgoNode rate limit (adjust as needed)
      if (i + batchSize < asaIds.length) {
        await delay(5);
      }
    }

    // Execute batches concurrently and collect results
    txIds.push(...(await Promise.all(batches)));

    console.timeEnd("groupOptInTransactions"); // End measuring execution time
    return txIds;
  } catch (error) {
    console.error("Failed to prepare or send opt-in transactions:", error);
    throw error;
  }
}

async function groupOptOutTransactions(asaIds, address, key) {
  console.time("groupOptOutTransactions"); // Start measuring execution time
  try {
    const account = await getAccount(key);
    const suggestedParams = await algodClient.getTransactionParams().do();
    const batchSize = 16; // Maximum transactions per group
    const waitRoundsToConfirm = 4; // Reduce confirmation rounds to optimize speed

    // Helper function to handle transaction batch processing
    const processBatch = async (batchIds) => {
      const optOutTxns = batchIds.map((assetId) =>
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          from: address,
          to: address,
          amount: 0,
          assetIndex: assetId,
          suggestedParams,
        })
      );

      algosdk.assignGroupID(optOutTxns);

      const signedTxns = await Promise.all(
        optOutTxns.map((txn) => txn.signTxn(account.sk))
      );

      const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
      await algosdk.waitForConfirmation(algodClient, txId, waitRoundsToConfirm);

      return txId;
    };

    // Split asaIds into batches and process concurrently
    const txIds = [];
    const batches = [];
    for (let i = 0; i < asaIds.length; i += batchSize) {
      const batchIds = asaIds.slice(i, i + batchSize);
      batches.push(processBatch(batchIds));

      // Delay to manage AlgoNode rate limit (adjust as needed)
      if (i + batchSize < asaIds.length) {
        await delay(5);
      }
    }

    // Execute batches concurrently and collect results
    txIds.push(...(await Promise.all(batches)));

    console.timeEnd("groupOptOutTransactions"); // End measuring execution time
    return txIds;
  } catch (error) {
    console.error("Failed to prepare or send opt-out transactions:", error);
    throw error;
  }
}

// Function to introduce delay
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const sendGroupedTransactions = async (transferTxns, walletId) => {
  try {
    // Send transactions in batches of 16
    const BATCH_SIZE = 16;
    const waitRoundsToConfirm = 4;
    let txIds = [];

    for (let i = 0; i < transferTxns.length; i += BATCH_SIZE) {
      const batch = transferTxns.slice(i, i + BATCH_SIZE);

      // Assign group ID
      algosdk.assignGroupID(batch);

      // Sign each transaction in the batch
      const signedTxns = await Promise.all(
        batch.map(async (txn) => {
          const txnBase64 = Buffer.from(txn.toByte()).toString("base64");
          const signedTxnBase64 = await signTransactionWithWalletApi(
            walletId,
            txnBase64
          );
          return Buffer.from(signedTxnBase64, "base64");
        })
      );

      const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
      await algosdk.waitForConfirmation(
        algodClient,
        batch[0].txID().toString(),
        waitRoundsToConfirm
      );
      txIds.push(txId);

      // Delay to manage AlgoNode rate limit (adjust as needed)
      if (i + BATCH_SIZE < transferTxns.length) {
        await delay(5); // Adjust delay as needed
      }
    }

    return txIds;
  } catch (error) {
    console.error("Failed to send grouped transactions:", error);
    throw error;
  }
};

const sendGroupedAssetTransactions = async (transactions, walletId) => {
  try {
    const suggestedParams = await algodClient.getTransactionParams().do();
    console.log("Amount: ", transactions[0].amount);

    const transferTxns = transactions.map((txn) => {
      const uniqueNote = new TextEncoder().encode(txn.note);
      return algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: txn.from,
        to: txn.to,
        amount: BigInt(txn.amount), // Ensure amount is a valid bigint
        assetIndex: txn.assetIndex,
        suggestedParams: suggestedParams,
        note: uniqueNote,
      });
    });

    return await sendGroupedTransactions(transferTxns, walletId);
  } catch (error) {
    console.error("Failed to send grouped asset transfer transactions:", error);
    throw error;
  }
};

const sendGroupedAlgoTransactions = async (transactions, key) => {
  try {
    const account = await getAccount(key);
    const suggestedParams = await algodClient.getTransactionParams().do();

    const transferTxns = transactions.map((txn) => {
      const uniqueNote = new TextEncoder().encode(txn.note);
      return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: txn.from,
        to: txn.to,
        amount: txn.amount,
        suggestedParams: suggestedParams,
        note: uniqueNote,
      });
    });

    await sendGroupedTransactions(transferTxns, account);
  } catch (error) {
    console.error("Failed to send grouped algo transfer transactions:", error);
    throw error;
  }
};

function encodeNFDTransactionsArray(transactionsArray) {
  return transactionsArray.map(([_type, txn]) => {
    return new Uint8Array(Buffer.from(txn, "base64"));
  });
}

// Fetch NFD data
const fetchNFDData = async function (domain) {
  try {
    const response = await axios.get(`${NFD_API_BASE_URL}/nfd/${domain}`);
    return response.data;
  } catch (err) {
    console.error("Failed to fetch NFD data:", err);
    throw err;
  }
};

// fetch segments
const fetchNFDSegments = async function (name) {
  try {
    const response = await axios.get(
      `${NFD_API_BASE_URL}/nfd/v2/search?name=${name}&view=full`
    );
    return response.data;
  } catch (err) {
    console.error("Failed to fetch NFD segments:", err);
    throw err;
  }
};

// Fetch NFD vault transactions
const fetchNFDVaultTransactions = async function (name, data) {
  try {
    const response = await axios.post(
      `${NFD_API_BASE_URL}/nfd/vault/sendTo/${name}`,
      data,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    // Ensure the response is correctly parsed
    const transactions = response.data;
    return transactions;
  } catch (err) {
    console.error("Failed to fetch NFD vault transactions:", err);
    throw err;
  }
};

async function processNFDs(transactions) {
  const allTransactions = [];

  const encodedTransactions = encodeNFDTransactionsArray(
    JSON.parse(transactions)
  );
  allTransactions.push({ encodedTransactions });
  return allTransactions;
}

async function sendGroupedNFDTransactions(transactions, key) {
  const allTransactions = await processNFDs(transactions);
  const transactionPromises = [];
  const account = await getAccount(key);

  for (const { encodedTransactions } of allTransactions) {
    const unsignedTxns = encodedTransactions.map((transaction) => {
      return algosdk.decodeUnsignedTransaction(transaction);
    });

    // Sign all transactions in the group
    const signedTxns = unsignedTxns.map(
      (txn) => algosdk.signTransaction(txn, account.sk).blob
    );

    // Create a promise for sending the group of transactions
    const transactionPromise = algodLimiter
      .schedule(() => algodClient.sendRawTransaction(signedTxns).do())
      .then(async ({ txId }) => {
        const confirmedTxn = await algosdk.waitForConfirmation(
          algodClient,
          txId,
          4
        );
        return {
          success: true,
          txId,
          confirmedRound: confirmedTxn["confirmed-round"],
        };
      })
      .catch((error) => {
        console.error("Error signing or sending transactions:", error);
        return { success: false, error: error.message };
      });

    transactionPromises.push(transactionPromise);
  }

  // Wait for all transactions to complete
  const results = await Promise.all(transactionPromises);

  // Separate confirmed and failed transactions
  const confirmedTransactions = results.filter((result) => result.success);
  const failedTransactions = results.filter((result) => !result.success);
  console.log(
    `Confirmed transactions: ${confirmedTransactions.length}, Failed transactions: ${failedTransactions.length}`
  );

  return { confirmedTransactions, failedTransactions };
}

// Utility to sign transactions via wallet management API
const signTransactionWithWalletApi = async (walletId, transaction) => {
  const startTime = Date.now();
  console.log("[signTransactionWithWalletApi] Starting signature request", {
    walletId,
  });

  const baseUrl = process.env.WALLET_API_URL.endsWith("/")
    ? process.env.WALLET_API_URL.slice(0, -1)
    : process.env.WALLET_API_URL;

  try {
    const requestConfig = {
      method: "post",
      url: `${baseUrl}/sign-transaction`,
      headers: {
        "X-forwarded-for": process.env.SERVER_IP,
        "Content-Type": "application/json",
        "x-client-id": process.env.MAIN_API_CLIENT_ID, // Added client ID header
      },
      data: {
        walletId,
        transaction,
      },
      timeout: 30000, // 30 seconds
    };

    console.log("[signTransactionWithWalletApi] Sending request", {
      url: requestConfig.url,
      clientId: process.env.MAIN_API_CLIENT_ID,
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
    });

    const response = await axios(requestConfig).catch((error) => {
      console.error("[signTransactionWithWalletApi] Axios request failed", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        timeElapsed: `${(Date.now() - startTime) / 1000}s`,
        headers: error.response?.headers,
        code: error.code,
        isTimeout: error.code === "ECONNABORTED",
        clientId: process.env.MAIN_API_CLIENT_ID, // Added to error logging
      });
      throw error;
    });

    if (!response?.data?.signedTransaction) {
      throw new Error(
        "Invalid wallet API response: Missing signed transaction data"
      );
    }

    console.log("[signTransactionWithWalletApi] Signature received", {
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
    });

    return response.data.signedTransaction;
  } catch (error) {
    console.error("[signTransactionWithWalletApi] Error occurred", {
      name: error.name,
      message: error.message,
      isAxiosError: error.isAxiosError,
      response: error.response?.data,
      status: error.response?.status,
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
      clientId: process.env.MAIN_API_CLIENT_ID, // Added to error logging
      stack: error.stack,
    });
    throw error;
  }
};

const transferAsset = async (
  fromAddress,
  toAddress,
  assetId,
  amount,
  walletId,
  note
) => {
  const startTime = Date.now();
  console.log("[transferAsset] Starting transfer", {
    fromAddress,
    toAddress,
    assetId,
    amount,
    walletId,
  });

  try {
    const suggestedParams = await algodClient.getTransactionParams().do();

    const assetAmount = await parseCurrency(assetId, amount);
    console.log("[transferAsset] Parsed amount and params", {
      assetAmount,
      suggestedParams: {
        fee: suggestedParams.fee,
        firstRound: suggestedParams.firstRound,
        lastRound: suggestedParams.lastRound,
      },
    });

    const txnParams = {
      from: fromAddress,
      to: toAddress,
      assetIndex: assetId,
      suggestedParams: suggestedParams,
      amount: assetAmount,
    };

    // Add a unique identifier to the note
    const uniqueNote = `${note} | #${Date.now()}-${Math.random()}`;
    if (uniqueNote) {
      txnParams.note = new Uint8Array(Buffer.from(uniqueNote, "utf8"));
    }

    const ptxn =
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(txnParams);
    const txnBase64 = Buffer.from(ptxn.toByte()).toString("base64");

    console.log("[transferAsset] Created transaction", {
      txId: ptxn.txID().toString(),
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
    });

    const signedTxnBase64 = await signTransactionWithWalletApi(
      walletId,
      txnBase64
    );
    const signedTxn = Buffer.from(signedTxnBase64, "base64");

    console.log("[transferAsset] Transaction signed", {
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
    });

    await algodClient.sendRawTransaction(signedTxn).do();
    const txId = ptxn.txID().toString();

    console.log("[transferAsset] Transaction submitted", {
      txId,
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
    });

    await algosdk.waitForConfirmation(algodClient, txId, 4);

    console.log("[transferAsset] Transaction confirmed", {
      txId,
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
    });

    return txId;
  } catch (error) {
    if (
      error.response?.body?.message?.includes("transaction already in ledger")
    ) {
      console.log("[transferAsset] Transaction already in ledger", {
        timeElapsed: `${(Date.now() - startTime) / 1000}s`,
      });
      return;
    }

    console.error("[transferAsset] Error occurred", {
      name: error.name,
      message: error.message,
      isAxiosError: error.isAxiosError,
      response: error.response?.data,
      status: error.response?.status,
      timeElapsed: `${(Date.now() - startTime) / 1000}s`,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = {
  fetchNFDData,
  fetchNFDVaultTransactions,
  sendGroupedAssetTransactions,
  sendGroupedAlgoTransactions,
  sendGroupedNFDTransactions,
  groupOptOutTransactions,
  groupOptInTransactions,
  checkIfOptedIn,
  findMatchingAssets,
  getMinFee,
  getMBR,
  getAccountInfo,
  transferAlgo,
  createAccount,
  getAccount,
  optIn,
  optOut,
  transferAsset,
  getAssetBalance,
  getAccountBalance,
  microAlgosToAlgo,
  algoToMicroAlgos,
  createToken,
  getAssetInfo,
  parseCurrency,
  fmtCurrency,
  getTransactionInfo,
  getWalletsToBlacklist,
  checkForSuspiciousAddresses,
  getFirstFundingTransaction,
  isFundedByBlacklistedWallet,
  convertFractionalAssetAmount,
  getAssetDecimals,
  fetchNFDSegments,
};
