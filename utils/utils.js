const axios = require("axios");
const network = "testnet";

const htmlEscape = (str) => {
  return String(str)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

const getAssetInformation = async (assetId) => {
  try {
    const response = await axios.get(
      `https://${network}-idx.algonode.cloud/v2/assets/${assetId}?include-all=true`
    );

    if (response.status != 200) {
      throw new Error("Network response was not OK");
    }

    const result = response.data.asset.params;
    return result;
  } catch (error) {
    console.error(`Error fetching asset info: ${error.message}`);
    console.log(`Retrying...`);
    return getAssetInformation(assetId);
  }
};

const paginate = (p, l, airdrops) => {
  const page = Number(p) || 1;
  const limit = Number(l) || 4;

  const startIndex = (page - 1) * limit;

  const endIndex = page * limit;

  const paginatedAirdrops = airdrops.slice(startIndex, endIndex);

  return paginatedAirdrops;
};

function isValidEndpoint(requestedPath, validEndpoints) {
  return validEndpoints.some((pattern) => {
    // Convert the route pattern to a regular expression
    const routeRegex = new RegExp(
      "^" + pattern.replace(/:[^\s/]+/g, "([\\w-]+)") + "$"
    );
    // Test the requested path against the regular expression
    return routeRegex.test(requestedPath);
  });
}

module.exports = {
  getAssetInformation,
  htmlEscape,
  paginate,
  isValidEndpoint,
};
