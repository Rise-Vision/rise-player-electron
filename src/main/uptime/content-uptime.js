const commonMessaging = require("common-display-module/messaging");
const messaging = require("../player/messaging");
const uptime = require("./uptime");
const templateUptimeLogger = require("../loggers/template-uptime-logger");

const uptimeInterval = 10000;
const responseTimeout = 3000;
let responseTimeoutId = null;
let expectedTemplate = null;

function handleUptimeResponse(response) {
  log.file("uptime - result", JSON.stringify(response));
  clearTimeout(responseTimeoutId);
  templateUptimeLogger.logTemplateUptime(response.presentationId, response.templateProductCode, response.templateVersion, true, response.errorValue);
}

function handleNoResponse() {
  log.file("uptime - no response");
  if (expectedTemplate) {
    templateUptimeLogger.logTemplateUptime(expectedTemplate.presentationId, expectedTemplate.productCode, expectedTemplate.version, false, null);
  }
}

function init() {
  messaging.onEvent("content-uptime-result", handleUptimeResponse);
  messaging.onEvent("playing-item", handlePlayingItemFromViewer);

  setInterval(retrieveUptime, uptimeInterval);
}

function retrieveUptime() {
  if (expectedTemplate && expectedTemplate.presentationType === "HTML Template" && uptime.isActive()) {
    commonMessaging.broadcastToLocalWS({
      from: "player-electron",
      topic: "content-uptime", 
      forPresentationId: expectedTemplate.presentationId
    });
    responseTimeoutId = setTimeout(handleNoResponse, responseTimeout);
  }
}

function handlePlayingItemFromViewer(response) {
  log.file("playing item received from Viewer", response);
  handlePlayingItem(response.item);
}

function handlePlayingItem(item) {
  log.file("playing item received", item);
  expectedTemplate = item;
}

module.exports = {
  init,
  handlePlayingItem
};
