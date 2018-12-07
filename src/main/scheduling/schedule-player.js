const scheduleParser = require("./schedule-parser");
const util = require("util");

const nothingPlayingListeners = [];
const timers = {
  scheduleCheck: null,
  itemDuration: null
};

let playUrlHandler = ()=>{};
let playableItems = [];
let playingItem = null;

module.exports = {
  start() {
    log.external("no-viewer mode");
    clearTimeout(timers.scheduleCheck);

    if (!scheduleParser.validateContent()) {
      logWithScheduleData("invalid schedule data");

      return nothingPlaying();
    }

    const now = new Date();
    considerFutureScheduledItems(now);
    playCurrentlyPlayableItems(now);
  },
  setPlayUrlHandler(fn) {playUrlHandler = fn;},
  listenForNothingPlaying(listener) {nothingPlayingListeners.push(listener);},
  stop() {
    Object.values(timers).forEach(clearTimeout);
    playingItem = null;
  }
};

function considerFutureScheduledItems(now) {
  if (scheduleParser.entireScheduleIs24x7()) {return;}

  const nextCheckMillis = Math.min(
    scheduleParser.millisUntilNextScheduledTime(now),
    millisUntilTomorrow(now)
  );

  timers.scheduleCheck = setTimeout(module.exports.start, nextCheckMillis);
}

function playCurrentlyPlayableItems(now) {
  playableItems = scheduleParser.getCurrentPlayableItems(now);

  if (playableItems.length === 0) {
    logWithScheduleData("no playable items");
    return nothingPlaying();
  }

  if (playingItemIsStillPlayable()) {
    return shiftToNextItem();
  }

  playItems();
}

function playItems() {
  let nextItem = playableItems.shift();
  playableItems.push(nextItem);

  let previousItem = playingItem;
  playingItem = nextItem;

  if (!previousItem || previousItem.objectReference !== nextItem.objectReference) {
    playUrl(nextItem.objectReference);
  }

  timers.itemDuration = setTimeout(playItems, nextItem.duration * 1000);
}

function playUrl(url) {playUrlHandler(url);}

function playingItemIsStillPlayable() {
  if (playingItem === null || timers.itemDuration === null) {return false;}

  return playableItems.some(item=>{
    return item.name === playingItem.name &&
      item.objectReference === playingItem.objectReference;
  });
}

function shiftToNextItem() {
  if (playingItem === null) {return;}

  do {
    playableItems.push(playableItems.shift());
  } while (playableItems[0].name !== playingItem.name ||
    playableItems[0].objectReference !== playingItem.objectReference);

  playableItems.push(playableItems.shift());
}

function millisUntilTomorrow(now) {
  const acceptablePrecisionSecondsIntoNextDay = 5;

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0);
  tomorrow.setMinutes(0);
  tomorrow.setSeconds(acceptablePrecisionSecondsIntoNextDay);

  return tomorrow - now;
}

function nothingPlaying() {
  clearTimeout(timers.itemDuration);
  playingItem = null;
  nothingPlayingListeners.forEach(listener=>listener());
}

function logWithScheduleData(event) {
  const logData = util.inspect(scheduleParser.getContent(), {depth: 5});
  log.external(event, logData);
}
