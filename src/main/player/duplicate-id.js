const messaging = require("./messaging.js");
const platform = require("rise-common-electron").platform;
const commonConfig = require("common-display-module");
const viewerController = require("../viewer/controller.js");
const watchdog = require("./watchdog.js");

module.exports = {
  attachMessagingHandlers() {
    messaging.on("duplicate-display-id", (data)=>{
      if (data.machineId === commonConfig.getMachineId()) {return;}
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
