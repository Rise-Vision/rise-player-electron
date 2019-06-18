const commonMessaging = require("common-display-module/messaging");
const messaging = require("../player/messaging");
const uptime = require("./uptime");
// const uptimeLogger = require("../loggers/uptime-logger");
// const pingTimeout = 3000;
const uptimeInterval = 60000;

function handleUptimeResponse(response) {
  log.file('content uptime - result', JSON.stringify(response));
}

function init() {
  messaging.onEvent('content-uptime-result', handleUptimeResponse);

  setInterval(retrieveUptime, uptimeInterval);
}

function retrieveUptime() {
  if (uptime.isActive()) {
    const schedule = {};
    const msMessage = {
      from: "player",
      topic: "content-uptime",
      schedule
    };
    commonMessaging.broadcastToLocalWS(msMessage);
  }
}

module.exports = {
  init
};
