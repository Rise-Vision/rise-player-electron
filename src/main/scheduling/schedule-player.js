const scheduleParser = require("./schedule-parser");

let playUrlHandler = ()=>{};

module.exports = {
  start(data = scheduleParser.getContent()) {
    // Temporarily play first url and return
    const noURL = "about:blank";

    if (!data) {return noURL;}
    if (!data.content) {return noURL;}
    if (!data.content.schedule) {return noURL;}
    if (!data.content.schedule.items) {return noURL;}
    if (!data.content.schedule.items.length) {return noURL;}
    if (typeof data.content.schedule.items[0] !== "object") {return noURL;}

    playUrl(data.content.schedule.items[0].objectReference);
  },
  setPlayUrlHandler(fn) {playUrlHandler = fn;}
};

function playUrl(url) {playUrlHandler(url);}
