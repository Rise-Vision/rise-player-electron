const scheduleParser = require("./schedule-parser");
const {inspect} = require("util");
const FALLBACK_URL = "about:blank";

let playUrlHandler = ()=>{};
let playableItems = [];
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

  playItems();
}

function playItems() {
  let item = playableItems.shift();
  playableItems.push(item);

  playUrl(item.objectReference);

  timers.itemDuration = setTimeout(playItems, item.duration * 1000);
}

function playUrl(url) {playUrlHandler(url);}

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
