const machineId = require("common-display-module").machineId;
const messaging = require("common-display-module").messaging;
const platform = require("rise-common-electron").platform;
const viewerController = requireRoot("viewer/controller.js");
const watchdog = requireRoot("installer/watchdog.js");

module.exports = {
  attachMessagingHandlers() {
    messaging.on("duplicate-display-id", (data)=>{
      if (data.machineId === machineId()) {return;}
      module.exports.logToBQ();
      module.exports.quitWatchdog();
      module.exports.quitPlayer();
      module.exports.updateViewer();
      module.exports.disconnectFromMessaging();
    });
  },
  logToBQ() {log.external("duplicate display");},
  updateViewer() {viewerController.showDuplicateIdError();},
  quitWatchdog() {watchdog.quit();},
  quitPlayer() {platform.killJava();},
  disconnectFromMessaging() {messaging.disconnect();}
};
