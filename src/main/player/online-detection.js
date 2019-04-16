let onlineDetectionWindow;
let onlineStatus;
let dirnameUrl = __dirname.replace(/#/g, "%23");

module.exports = {
  init(ipcMain, BrowserWindow) {
    if (onlineDetectionWindow !== undefined) {return Promise.resolve();}

    return new Promise((res)=>{
      onlineDetectionWindow = new BrowserWindow({
        width: 0,
        height: 0,
        show: false,
        webPreferences: {nodeIntegration: true}
      });

      onlineDetectionWindow.loadURL(`file://${dirnameUrl}/online-detection.html`);
      ipcMain.on("online-status-changed", (evt, status)=>{
        onlineStatus = status;
        res();
      });

      onlineDetectionWindow.on("closed", ()=>{log.debug("online detection window closed");});
    });
  },
  isOnline() {
    return onlineStatus === "online";
  },
  closeWindow() {
    onlineDetectionWindow && onlineDetectionWindow.close();
    onlineDetectionWindow = null;
  }
};
