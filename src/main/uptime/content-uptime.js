const commonMessaging = require("common-display-module/messaging");
const messaging = require("../player/messaging");
const templateUptimeLogger = require("../loggers/template-uptime-logger");
const componentUptimeLogger = require("../loggers/component-uptime-logger");

const uptimeInterval = 5 * 60000;
const responseTimeout = 6000;
let responseTimeoutId = null;
let playingItem = null;
let expectedTemplate = null;

function handleUptimeResponse(response) {
  if (!expectedTemplate || !isValidResponse(response)) {
    log.file("content uptime - invalid result");
    return;
  }

  log.file("content uptime - result");

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
    log.file("content uptime - no response");

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
  if (playingItem && playingItem.presentationType === "HTML Template") {
    commonMessaging.checkMessagingServiceConnection()
    .then(msResult=>{
      if (msResult !== 'connected') {
        throw(msResult);
      }

      commonMessaging.broadcastToLocalWS({
        from: "player-electron",
        topic: "content-uptime", 
        forPresentationId: playingItem.presentationId
      });
      expectedTemplate = playingItem;
      responseTimeoutId = setTimeout(handleNoResponse, responseTimeout);        
    })
    .catch(()=>{
      log.file("content uptime - ms not connected");
    });
  }
}

function handlePlayingItemFromViewer(response) {
  response && handlePlayingItem(response.item);
}

function handlePlayingItem(item) {
  playingItem = item;
}

module.exports = {
  init,
  handlePlayingItem
};
