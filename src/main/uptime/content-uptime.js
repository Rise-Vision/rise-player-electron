const commonMessaging = require("common-display-module/messaging");
const messaging = require("../player/messaging");
const uptime = require("./uptime");
// const templateUptimeLogger = require("../loggers/template-uptime-logger");

const uptimeInterval = 10000;
const responseTimeout = 3000;
let responseTimeoutId = null;
let playingItem = null;
let expectedTemplate = null;

function handleUptimeResponse(response) {
  log.file("uptime - result", JSON.stringify(response));

  if (!expectedTemplate || !isValidResponse(response)) {
    logger.log('uptime - invalid result', JSON.stringify(response));
    return;
  }

  clearTimeout(responseTimeoutId);
  expectedTemplate = null;

  // templateUptimeLogger.logTemplateUptime(response.presentationId, response.templateProductCode, response.templateVersion, true, response.errorValue);
}

function isValidResponse(response) {
  return response && response.template && response.components &&
    response.template.presentation_id === expectedTemplate.presentationId;
}

function handleNoResponse() {
  log.file("uptime - no response", JSON.stringify(expectedTemplate));
  if (expectedTemplate) {
    // templateUptimeLogger.logTemplateUptime(expectedTemplate.presentationId, expectedTemplate.productCode, expectedTemplate.version, false, null);
    expectedTemplate = null;
  }
}

function init() {
  messaging.onEvent("content-uptime-result", handleUptimeResponse);
  messaging.onEvent("playing-item", handlePlayingItemFromViewer);

  setInterval(retrieveUptime, uptimeInterval);
}

function retrieveUptime() {
  if (playingItem && playingItem.presentationType === "HTML Template" && uptime.isActive()) {
    commonMessaging.broadcastToLocalWS({
      from: "player-electron",
      topic: "content-uptime", 
      forPresentationId: playingItem.presentationId
    });
    expectedTemplate = playingItem;
    responseTimeoutId = setTimeout(handleNoResponse, responseTimeout);
  }
}

function handlePlayingItemFromViewer(response) {
  log.file("playing item received from Viewer", response && JSON.stringify(response));
  response && response.item && handlePlayingItem(response.item);
}

function handlePlayingItem(item) {
  log.file("playing item received", JSON.stringify(item));
  playingItem = item;
}

module.exports = {
  init,
  handlePlayingItem
};
