const commonConfig = require("common-display-module");
const PROJECT_NAME = "client-side-events";
const DATASET_NAME = "Template_Uptime_Events";
const FAILED_ENTRY_FILE = ".failed-template-uptime-log-entries.json";
const  bqController = require("rise-common-electron")
    .bqController(PROJECT_NAME, DATASET_NAME, FAILED_ENTRY_FILE, commonConfig.getInstallDir());

bqController.init();

module.exports = {
  getBQClient() { return bqController.getBQClient(); },
  pendingEntries() { return bqController.pendingEntries(); },
  logTemplateUptime(result) {
    const display_id = commonConfig.getDisplaySettingsSync().displayid;

    if (!display_id) {
      log.file("template uptime logger", "missing display id");
      return Promise.reject(Error("missing display id"));
    }

    result.display_id = display_id;
    result.ts = (new Date()).toISOString();

    return bqController.log("events", result)
    .catch(e=>{
      log.file("Could not log to bq " + require("util").inspect(e, { depth: null }));
    });
  }
};
