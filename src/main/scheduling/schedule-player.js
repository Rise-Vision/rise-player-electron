const scheduleParser = require("./schedule-parser");
const {inspect} = require("util");

let playUrlHandler = ()=>{};

module.exports = {
  start(data = scheduleParser.getContent(), fallbackUrl = "about:blank") {
    if (!validateData(data)) {
      log.external("invalid schedule data", inspect(data));

      return playUrl(fallbackUrl);
    }

    playUrl(data.content.schedule.items[0].objectReference);
  },
  setPlayUrlHandler(fn) {playUrlHandler = fn;}
};

function playUrl(url) {playUrlHandler(url);}

function validateData(data) {
  if (!data) {return false;}
  if (!data.content) {return false;}
  if (!data.content.schedule) {return false;}
  if (!data.content.schedule.items) {return false;}
  if (!data.content.schedule.items.length) {return false;}
  if (typeof data.content.schedule.items[0] !== "object") {return false;}

  return true;
}
