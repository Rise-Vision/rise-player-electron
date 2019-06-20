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
  logTemplateUptime(presentationId, templateProductCode, templateVersion, responding, errorValue) { // eslint-disable-line max-params
    const display_id = commonConfig.getDisplaySettingsSync().displayid;

    if (!display_id) {
      log.file("template uptime logger", "missing display id");
      return Promise.reject(Error("missing display id"));
    }

    return bqController.log("events", {
      display_id,
      presentation_id: presentationId,
      template_product_code: templateProductCode,
      template_version: templateVersion,
      responding,
      error: errorValue,
      ts: (new Date()).toISOString()
    })
    .catch(e=>{
      log.file("Could not log to bq " + require("util").inspect(e, { depth: null }));
    });
  }
};
