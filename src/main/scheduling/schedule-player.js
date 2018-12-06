const scheduleParser = require("./schedule-parser");
const {inspect} = require("util");
const FALLBACK_URL = "about:blank";

let playUrlHandler = ()=>{};
let playableItems = [];
let playingItem = null;
let nothingPlayingListeners = [];
let timers = {
  scheduleCheck: null,
  itemDuration: null
};

module.exports = {
  start() {
    clearTimeout(timers.scheduleCheck);

    if (!scheduleParser.validateContent()) {
      log.external("invalid schedule data", inspect(scheduleParser.getContent()));

      nothingPlaying();
      return playUrl(FALLBACK_URL);
    }

    let now = new Date();
    considerFutureScheduledItems(now);
    playCurrentlyPlayableItems(now);
  },
  setPlayUrlHandler(fn) {playUrlHandler = fn;},
  getFallbackUrl() {return FALLBACK_URL;},
  listenForNothingPlaying(listener) {nothingPlayingListeners.push(listener);}
};

function considerFutureScheduledItems(now) {
  if (scheduleParser.entireScheduleIs24x7()) {return;}

  const nextCheckMillis = Math.min(...[
    scheduleParser.millisUntilNextScheduledTime(now),
    millisUntilTomorrow(now)
  ]);

  timers.scheduleCheck = setTimeout(module.exports.start, nextCheckMillis);
}

function playCurrentlyPlayableItems(now) {
  playableItems = scheduleParser.getCurrentPlayableItems(now);

  if (playableItems.length === 0) {
    log.external("no playable items", inspect(scheduleParser.getContent()));
    return nothingPlaying();
  }

  if (playingItemIsStillPlayable()) {
    return shiftToNextItem();
  }

  playItems();
}

function playItems() {
  let item = playableItems.shift();
  playableItems.push(item);

  playingItem = item;
  playUrl(item.objectReference);

  timers.itemDuration = setTimeout(playItems, item.duration * 1000);
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
