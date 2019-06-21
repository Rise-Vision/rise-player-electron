const commonMessaging = require("common-display-module/messaging");
const messaging = require("../player/messaging");
const uptime = require("./uptime");
const templateUptimeLogger = require("../loggers/template-uptime-logger");
const componentUptimeLogger = require("../loggers/component-uptime-logger");

const uptimeInterval = 60000;
const responseTimeout = 3000;
let responseTimeoutId = null;
let playingItem = null;
let expectedTemplate = null;

function handleUptimeResponse(response) {
  if (!expectedTemplate || !isValidResponse(response)) {
    log.file("uptime - invalid result", response && JSON.stringify(response));
    return;
  }

  log.file("uptime - result", JSON.stringify(response));

  clearTimeout(responseTimeoutId);
  expectedTemplate = null;

  const result = response.template;
  result.responding = true;
  templateUptimeLogger.logTemplateUptime(result);

  response.components.forEach(entry=>componentUptimeLogger.logComponentUptime(entry));
}

function isValidResponse(response) {
  return response && response.template && response.components &&
    response.template.presentation_id === expectedTemplate.presentationId;
}

function handleNoResponse() {
  if (expectedTemplate) {
    log.file("uptime - no response", JSON.stringify(expectedTemplate));

    templateUptimeLogger.logTemplateUptime({
      presentation_id: expectedTemplate.presentationId,
      template_product_code: expectedTemplate.productCode,
      template_version: expectedTemplate.version,
      responding: false
    });
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
