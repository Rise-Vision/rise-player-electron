const ipc = require("electron").ipcRenderer;
const platform = require("rise-common-electron").platform;
const commonConfig = require("common-display-module");
const gcs = require("../../player/gcs");

const displaySettings = commonConfig.getDisplaySettingsSync();
const playerType = commonConfig.isBetaLauncher() ? "beta" : "stable";
const playerVersion = commonConfig.getLatestVersionInManifest();
const os = platform.getOSDescription();

const displayId = displaySettings.displayid;
const data = gcs.getCachedFileContentsSync(`risevision-display-notifications/${displayId}/content.json`);

let companyId = "";
if (data && data.content && data.content.schedule) {
  companyId = data.content.schedule.companyId;
}

window.getRisePlayerConfiguration = function() {
  ipc.send("player-configuration-called");
  return {
    playerInfo: {
      displayId,
      companyId,
      playerType,
      playerVersion,
      os
    },
    localMessagingInfo: {
      player: "electron",
      connectionType: "websocket",
      detail: {
        serverUrl: "http://localhost:8080"
      }
    }
  };
};
