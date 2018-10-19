const messaging = require("common-display-module/messaging");
const scheduleParser = require("./schedule-parser");

let schedule = null;

function setSchedule(content) {
  schedule = content.schedule;
}

/**
 * This function will be called every 5 min
 */
function calculate() {
  if (!schedule) {
    return;
  }

  messaging.checkMessagingServiceConnection()
    .then(result => {
      const shouldBePlaying = scheduleParser.canPlay(schedule);
      const connectedToMS = result === 'connected';
      log.external('uptime', {shouldBePlaying, connectedToMS});
    });
}

module.exports = {
  setSchedule,
  calculate
};
