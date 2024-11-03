const returnRandomSection = (arr, step) => {
  if (!arr || !step) return arr;
  step = arr.length < step ? arr.length : step;
  const len = arr.length;
  const points = Math.floor(len / step);
  const remainder = len % step;
  let i = 0;
  const indices = [];
  while (i <= points) {
    indices.push(i * step);
    i++;
  }
  const index = Math.floor(Math.random(points) * indices.length);
  const start =
    indices[index] === points * step && !remainder
      ? indices[index - 1]
      : indices[index] === points * step && remainder
      ? indices[index] - (step - remainder)
      : indices[index];

  const stop =
    indices[index] === points * step && remainder
      ? indices[index] + remainder
      : start + step;
  let x = start;
  const ret = [];
  while (x < stop) {
    ret.push(arr[x]);
    x++;
  }

  return ret;
};

const randomize = (arr = []) => {
  let i = 0;
  const array = arr,
    ret = [],
    getLength = () => array.length,
    len = getLength(),
    getIndex = () => Math.floor(Math.random(getLength() - 1) * getLength());
  while (i < len) {
    const index = getIndex();
    ret.push(array.splice(index, 1)[0]);
    i++;
  }
  return ret;
};

module.exports = {
  returnRandomSection,
  randomize,
};
