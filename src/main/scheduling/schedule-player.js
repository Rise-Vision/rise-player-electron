const scheduleParser = require("./schedule-parser");
const {inspect} = require("util");

let playUrlHandler = ()=>{};

module.exports = {
  start(delayFn = setTimeout) {
    timers.forEach(clearTimeout);

    if (!scheduleParser.validateContent()) {
      log.external("invalid schedule data", inspect(scheduleParser.getContent()));

      return playUrl(FALLBACK_URL);
    }

    playUrl(data.content.schedule.items[0].objectReference);
  },
  setPlayUrlHandler(fn) {playUrlHandler = fn;}
};

function playUrl(url) {playUrlHandler(url);}


}
