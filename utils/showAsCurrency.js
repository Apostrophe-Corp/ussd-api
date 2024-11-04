const { trimOverkill } = require("./trimOverkill");
const { nFormatter } = require("./nFormatter");
const { currencyFormat } = require("./currencyFormat");

const showAsCurrency = function ({
  val = 0,
  digits = 0,
  depth = 1e6,
  blankDecimals = false,
}) {
  const f =
    val < 1 ? trimOverkill(val ?? 0, digits) : nFormatter(val, digits, depth);
  const c = isNaN(f)
    ? f
    : f >= 1
      ? currencyFormat(f, blankDecimals, digits)
      : trimOverkill(f, digits);

  return c;
}

module.exports = { showAsCurrency };
