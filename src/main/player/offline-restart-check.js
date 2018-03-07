const subscriptionCheck = require("./offline-subscription-check");
const restart = require("./restart");

const WAIT_FOR_VIEWER_IN_MILLIS = 60 * 1000;

let count = -1;
let timerId = null;
let viewerHasStarted = false;

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

function startRestartTimeoutIfRpp(schedule = setTimeout) {
  resetTimer();

  if( shouldBeConsideredOffline() ) {
    // if already in offline, no more restarts
    return Promise.resolve();
  }

  return subscriptionCheck.isSubscribed().then(subscribed => {
    if (subscribed) {
      timerId = schedule(() => {
        viewerHasStarted || restart.restart([`--offline-restart-count=${count + 1}`]);
      }, WAIT_FOR_VIEWER_IN_MILLIS);
    }
  });
}

function markViewerAsStarted() {
  viewerHasStarted = true;
}

function resetTimer() {
  if (timerId) {
    clearTimeout(timerId);
  }

  timerId = null;
}

// For test purposes only.
function reset() {
  resetTimer();

  count = -1;
  viewerHasStarted = false;
}

module.exports = {
  getCount,
  shouldBeConsideredOffline,
  startRestartTimeoutIfRpp,
  markViewerAsStarted,
  reset
};
