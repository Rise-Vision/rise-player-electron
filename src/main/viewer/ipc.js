const ipc = require("electron").ipcRenderer;
const commonConfig = require("common-display-module");
const displaySettings = commonConfig.getDisplaySettingsSync();
const webFrame = require("electron").webFrame;
let messageHandlers = [];

if(displaySettings.enablepinchtozoom !== "true") {
  // Disable pinch-to-zoom
  webFrame.setVisualZoomLevelLimits && webFrame.setVisualZoomLevelLimits(1, 1);
  webFrame.setZoomLevelLimits && webFrame.setZoomLevelLimits(1, 1);
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

ipc.on("viewer-message-received", (evt, message)=>{
  messageHandlers.forEach((handler)=>handler(message));
});
