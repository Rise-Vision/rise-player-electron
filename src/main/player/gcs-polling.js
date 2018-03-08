const commonConfig = require("common-display-module");
const contentLoader = require("../viewer/content-loader.js");
const gcs = require("../player/gcs.js");
const inspect = require("util").inspect;
const messaging = require("./messaging.js");

const bucketName = "risevision-display-notifications";

let displayId;
let pollingTimer;
let gcsCommandsPath;

module.exports = {
  init() {
    displayId = commonConfig.getDisplaySettingsSync().displayid || "";
    gcsCommandsPath = `${bucketName}/${displayId}/command.json`;

    messaging.onEvent("ms-connected", module.exports.onConnected);
    messaging.onEvent("ms-disconnected", module.exports.onDisconnected);

    module.exports.refreshCommandsFileGeneration();
  },
  getPollingInterval() {
    return 60 * 60 * 1000;
  },
  onConnected() {
    if(pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  },
  onDisconnected() {
    if (pollingTimer) { return; }
    pollingTimer = setInterval(()=>{
      log.external("polling GCS");

      module.exports.pollGCS();
    }, module.exports.getPollingInterval());
  },
  pollGCS() {
    return module.exports.processCommands()
    .catch((err)=>{
      if(!err.message.includes("404") && !err.message.includes("401")) {
        log.error("Error processing GCS commands: " + inspect(err));
      }
    })
    .then(module.exports.fetchContent)
    .catch((err)=>{
      if(!err.message.includes("404") && !err.message.includes("401")) {
        log.error("Error loading GCS content: " + inspect(err));
      }
      else {
        log.error("GCS content not found");
      }
    });
  },
  refreshCommandsFileGeneration() {
    return gcs.getFileContents(gcsCommandsPath, { useLocalData: false })
    .catch((err)=>{
      if(!err.message.includes("404") && !err.message.includes("401")) {
        log.error("Error refreshing GCS commands: " + inspect(err));
      }
    });
  },
  processCommands() {
    return gcs.getFileContents(gcsCommandsPath, { useLocalData: false }).then((data)=>{
      if(data && ["restart", "reboot", "screenshot"].includes(data.command)) {
        let message = Object.assign(data, { message: data.command + "-request" });

        log.file("injecting GCS message: " + inspect(message));
        messaging.injectMessage(message);
      }
    });
  },
  fetchContent() {
    return gcs.getFileContents(contentLoader.contentPath(), { useLocalData: false }).then((data)=>{
      if (!data) {return;}
      contentLoader.sendContentToViewer(data);
    });
  }
};
