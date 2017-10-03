const PROJECT_NAME = "client-side-events",
  DATASET_NAME = "Rise_Cache_V2",
  FAILED_ENTRY_FILE = ".failed-rise-cache-log-entries.json",
  config = requireRoot("installer/config.js"),
  bqController = require("rise-common-electron")
    .bqController(PROJECT_NAME, DATASET_NAME, FAILED_ENTRY_FILE, config.getInstallDir());

bqController.init();

module.exports = {
  getBQClient() { return bqController.getBQClient(); },
  log(data) {
    let nowDate = new Date();

    data.ts = nowDate.toISOString();

    return bqController.log("events", data, nowDate, bqController.getDateForTableName(nowDate))
      .catch((e)=>{
        log.file("Could not log to bq " + require("util").inspect(e, { depth: null }));
      });
  },
  failedFileName() { return FAILED_ENTRY_FILE; },
  pendingEntries() { return bqController.pendingEntries(); }
};
