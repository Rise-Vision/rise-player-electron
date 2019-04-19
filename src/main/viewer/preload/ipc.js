const ipc = require("electron").ipcRenderer;
const commonConfig = require("common-display-module");
const path = require("path");
const displaySettings = commonConfig.getDisplaySettingsSync();
const webFrame = require("electron").webFrame;
const platform = require("rise-common-electron").platform;

const WIDGETS_SINGLEFILE_FILE = "b6f5f06a0e080803355f68fcaf65cf57";
const WIDGETS_FOLDER_FILE = "3ee8348d080fb43f58814c44801d28fe";
const singleFilePath = path.join(commonConfig.getInstallDir(), WIDGETS_SINGLEFILE_FILE);
const useRLSSingleFile = platform.fileExists(singleFilePath);
const folderPath = path.join(commonConfig.getInstallDir(), WIDGETS_FOLDER_FILE);
const useRLSFolder = platform.fileExists(folderPath);

let messageHandlers = [];

if(displaySettings.enablepinchtozoom !== "true") {
  // Disable pinch-to-zoom
  webFrame.setVisualZoomLevelLimits(1, 1);
}

webFrame.registerURLSchemeAsPrivileged("rchttp");
webFrame.registerURLSchemeAsPrivileged("rchttps");

window.postToPlayer = (message, overrideChannel)=>{
  if (overrideChannel) {
    ipc.send(message.msg, message);
  } else {
    ipc.send("viewer-message", message);
  }
};

window.receiveFromPlayer = function receiveFromPlayer(msg, handler) {
  messageHandlers.push((message)=>{
    if (msg === message.msg) {
      handler(message);
    }
  });
};

window.disableViewerContentFetch = true;
window.enableWidgetLogging = true;
window.enableViewerLogFromPlayer = true;
window.enableRiseCacheScheme = true;
window.useRLSSingleFile = useRLSSingleFile;
window.useRLSFolder = useRLSFolder;

ipc.on("viewer-message-received", (evt, message)=>{
  messageHandlers.forEach((handler)=>handler(message));
});

ipc.on("renderer-ping", ()=>ipc.send("renderer-pong"));
