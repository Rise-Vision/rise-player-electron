const scheduleParser = require("./schedule-parser");

let schedule = null;

function setSchedule(content) {
  schedule = content.schedule;
}

/**
 * This function will be called every 5 min
 */
function calculate() {
  if (schedule) {
    const shouldBePlaying = scheduleParser.canPlay(schedule);
    console.log('should be playing', shouldBePlaying);
  }
}

module.exports = {
  setSchedule,
  calculate
};
