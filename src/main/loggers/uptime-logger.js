const commonConfig = require("common-display-module");
const PROJECT_NAME = "client-side-events";
const DATASET_NAME = "Uptime_Events";
const FAILED_ENTRY_FILE = ".failed-uptime-log-entries.json";
const  bqController = require("rise-common-electron")
    .bqController(PROJECT_NAME, DATASET_NAME, FAILED_ENTRY_FILE, commonConfig.getInstallDir());

bqController.init();

module.exports = {
  log(connected, showing, scheduled) {
    const display_id = commonConfig.getDisplaySettingsSync().displayid;

    if (!display_id) {return log.file("uptime logger", "missing display id");}

    return bqController.log("events", {
      display_id,
      ts: (new Date()).toISOString(),
      showing,
      connected,
      scheduled
    });
  }
};
