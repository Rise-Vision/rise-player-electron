const platform = require("rise-common-electron").platform,
  config = require("../player/config.js"),
  commonConfig = require("common-display-module"),
  PROJECT_NAME = "client-side-events",
  DATASET_NAME = "Installer_Events",
  FAILED_ENTRY_FILE = ".failed-log-entries.json",
  bqController = require("rise-common-electron")
    .bqController(PROJECT_NAME, DATASET_NAME, FAILED_ENTRY_FILE, commonConfig.getInstallDir());

let displaySettings = {},
  os = platform.getOSDescription() || (platform.getOS() + " " + platform.getArch());

bqController.init();

module.exports = {
  getBQClient() { return bqController.getBQClient(); },
  setDisplaySettings(settings) {
    displaySettings = settings;
  },
  log(eventName, eventDetails, nowDate) {
    let version = commonConfig.getModuleVersion(config.moduleName);
    if (!eventName) {return Promise.reject("eventName is required");}
    if (!nowDate || !Date.prototype.isPrototypeOf(nowDate)) {
      nowDate = new Date();
    }

    if (typeof eventDetails === "object") eventDetails = JSON.stringify(eventDetails);

    var data = {
      event: eventName,
      event_details: eventDetails || "",
      display_id: displaySettings.displayid || displaySettings.tempdisplayid,
      installer_version: version,
      os: os,
      ts: nowDate.toISOString()
    };

    return bqController.log("events" + bqController.getDateForTableName(nowDate), data, nowDate)
      .catch((e)=>{
        log.file("Could not log to bq " + require("util").inspect(e, { depth: null }));
      });
  },
  pendingEntries() { return bqController.pendingEntries(); },
  maxQueue() { return bqController.maxQueue(); }
};
