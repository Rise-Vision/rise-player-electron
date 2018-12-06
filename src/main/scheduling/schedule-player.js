const scheduleParser = require("./schedule-parser");
const {inspect} = require("util");
const FALLBACK_URL = "about:blank";

let playUrlHandler = ()=>{};
let timers = [];

module.exports = {
  start() {
    timers.forEach(clearTimeout);

    if (!scheduleParser.validateContent()) {
      log.external("invalid schedule data", inspect(scheduleParser.getContent()));

      return playUrl(FALLBACK_URL);
    }

    let now = new Date();
    considerFutureScheduledItems(now);
    playCurrentlyPlayableItems(now);
  },
  setPlayUrlHandler(fn) {playUrlHandler = fn;},
  getFallbackUrl() {return FALLBACK_URL;}
};

function considerFutureScheduledItems(now) {
  if (scheduleParser.entireScheduleIs24x7()) {return;}

  const nextCheckMillis = Math.min(...[
    scheduleParser.millisUntilNextScheduledTime(now),
    millisUntilTomorrow(now)
  ]);

  setTimeout(()=>module.exports.start(), nextCheckMillis);
}

function playCurrentlyPlayableItems(now) {
  return now;
  // playUrl(data.content.schedule.items[0].objectReference);
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
