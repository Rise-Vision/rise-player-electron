let count = -1;

function getCount(args = process.argv.slice(1)) {
  if (count === -1) {
    const argumentsAsText = args.join('=');
    const match = /--offline-restart-count=(\d)/.exec(argumentsAsText);

    count = match ? parseInt(match[1]) : 0;
  }

  return count;
}

function shouldBeConsideredOffline(args = process.argv.slice(1)) {
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
