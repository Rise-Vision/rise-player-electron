const commonConfig = require("common-display-module").config;

const appsController = require("rise-common-electron")
.bqController("client-side-events", "Apps_Events", ".failed-apps-entries.json", commonConfig.getInstallDir());

appsController.init();

const playerConfigController = require("rise-common-electron")
.bqController("client-side-events", "Player_Data", ".failed-config-entries.json", commonConfig.getInstallDir());

playerConfigController.init();

const defaultController = require("rise-common-electron")
.bqController("client-side-events", "Viewer_Events", ".failed-viewer-entries.json", commonConfig.getInstallDir());

defaultController.init();

module.exports = {
  log(data) {
    let controller = defaultController;

    if (data.serviceUrl.includes("Apps_Events")) {controller = appsController;}
    if (data.serviceUrl.includes("Player_Data")) {controller = playerConfigController;}

    let tableName = data.serviceUrl.split("/")[10].slice(0, -8);
    let suffix = data.serviceUrl.split("/")[10].substr(-8);
    let date = new Date();

    log.debug(`Logging to ${tableName}${suffix}`);
    
    return controller.log(tableName + suffix, data.insertData, date)
    .catch((e)=>{
      log.file("Could not log to bq table: " + tableName + " with insertData: " +
      JSON.stringify(data.insertData) + " " + require("util").inspect(e, { depth: null }));
    });
  }
};
