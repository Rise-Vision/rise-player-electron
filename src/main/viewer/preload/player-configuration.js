const platform = require("rise-common-electron").platform;
const commonConfig = require("common-display-module");
const gcs = require("../../player/gcs");

const displaySettings = commonConfig.getDisplaySettingsSync();

window.getRisePlayerConfiguration = function() {
  const playerType = commonConfig.isBetaLauncher() ? "beta" : "stable";
  const playerVersion = commonConfig.getLatestVersionInManifest();
  const os = platform.getOSDescription();

  const displayId = displaySettings.displayid;
  const data = gcs.getCachedFileContentsSync(`risevision-display-notifications/${displayId}/content.json`);

  let companyId = "";
  if (data && data.content && data.content.schedule) {
    companyId = data.content.schedule.companyId;
  }

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
