const PROJECT_NAME = "client-side-events",
  DATASET_NAME = "Widget_Events",
  FAILED_ENTRY_FILE = ".failed-widget-log-entries.json",
  config = requireRoot("installer/config.js"),
  bqController = require("rise-common-electron")
    .bqController(PROJECT_NAME, DATASET_NAME, FAILED_ENTRY_FILE, config.getInstallDir());

bqController.init();

module.exports = {
  getBQClient() { return bqController.getBQClient(); },
  log(data) {
    let widgetData;
    let nowDate = new Date();

    try {
      widgetData = JSON.parse(data.params);
    } catch (error) {
      log.debug(`widget-logger params fail - ${error}`);
      return;
    }

    widgetData.ts = nowDate.toISOString();

    return bqController.log(data.table, widgetData, nowDate, data.suffix)
      .catch((e)=>{
        log.file("Could not log to bq " + require("util").inspect(e, { depth: null }));
      });
  },
  failedFileName() { return FAILED_ENTRY_FILE; },
  pendingEntries() { return bqController.pendingEntries(); }
};
