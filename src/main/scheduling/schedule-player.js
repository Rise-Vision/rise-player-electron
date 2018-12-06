const scheduleParser = require("./schedule-parser");
const {inspect} = require("util");
const FALLBACK_URL = "about:blank";

let playUrlHandler = ()=>{};
let timers = [];

module.exports = {
  start(delayFn = setTimeout) {
    timers.forEach(clearTimeout);

    if (!scheduleParser.validateContent()) {
      log.external("invalid schedule data", inspect(scheduleParser.getContent()));

      return playUrl(FALLBACK_URL);
    }

    considerFuturePlayableItems(delayFn);

    playCurrentlyPlayableItems();
  },
  setPlayUrlHandler(fn) {playUrlHandler = fn;},
  getFallbackUrl() {return FALLBACK_URL;}
};

function considerFuturePlayableItems(delayFn) {
  const nextCheckMillis = scheduleParser.millisUntilNextScheduledTime();

  if (nextCheckMillis === Number.MAX_VALUE) {return;}

  delayFn(()=>module.exports.start(delayFn), nextCheckMillis);
}

function playCurrentlyPlayableItems() {
  // playUrl(data.content.schedule.items[0].objectReference);
}

function playUrl(url) {playUrlHandler(url);}
