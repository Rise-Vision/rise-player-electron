const platform = require("rise-common-electron").platform;
const network = require("rise-common-electron").network;
const bqClient = require("rise-common-electron")
        .bqClient("client-side-events", "Player_Data");
const commonConfig = require("common-display-module");
const config = require("../player/config.js");
const machineId = require("common-display-module").machineId;
const offlineSubscriptionCheck = require("../player/offline-subscription-check.js");


module.exports = {
  getBQClient() { return bqClient; },
  stringify(obj) {
    return JSON.stringify(obj);
  },
  logClientInfo(viewerConfig) {
    return network.getLocalIP().then((localIP)=>{
      let displaySettings = commonConfig.getDisplaySettingsSync();
      let nowDate = new Date();
      let playerConfig = {
        machine_id: machineId(),
        display_id: displaySettings.displayid,
        os_description: platform.getOSDescription(),
        installer_version: commonConfig.getModuleVersion("player-electron"),
        player_name: "RisePlayerElectron",
        java_version: "",
        player_version: commonConfig.getModuleVersion("player-electron"),
        cache_version: config.cacheVersion,
        viewer_version: viewerConfig.viewerVersion,
        browser_name: "Chromium",
        browser_version: process.versions.chrome,
        width: viewerConfig.width,
        height: viewerConfig.height,
        local_ip: localIP,
        mac: network.getMAC(),
        serial_number: config.getSerialNumber()
      };

      return offlineSubscriptionCheck.isSubscribed().then((isSubscribed) => {
        playerConfig.offline_subscription = isSubscribed;
        let playerConfigStr = module.exports.stringify(playerConfig);

        if(!commonConfig.fileExists("display_config.json") || commonConfig.readFile("display_config.json") !== playerConfigStr) {
          playerConfig.ts = nowDate.toISOString();

          return bqClient.insert("configuration", playerConfig)
            .then(()=>{
            commonConfig.writeFile("display_config.json", playerConfigStr);
          });
        }
        else {
          return Promise.resolve();
        }
      });

    });
  }
};