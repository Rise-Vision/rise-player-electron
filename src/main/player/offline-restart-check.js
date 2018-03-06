let count = -1;

function getCount(args = process.argv) {
  if (count === -1) {
    const argumentsAsText = args.slice(1).join('=');
    const match = /--offline-restart-count=(\d)/.exec(argumentsAsText);

    count = match ? parseInt(match[1]) : 0;
  }

  return count;
}

function shouldBeConsideredOffline(args = process.argv) {
  return getCount(args) >= 3;
}

// For test purposes only.
function reset() {
  count = -1;
}

module.exports = {
  getCount,
  shouldBeConsideredOffline,
  reset
};
