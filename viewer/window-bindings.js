let viewerWindow;

module.exports = {
  setWindow(_viewerWindow) {
    viewerWindow = _viewerWindow;
  },
  sendToViewer(message) {
    if (viewerWindow && !viewerWindow.isDestroyed()) {
      viewerWindow.webContents.send("viewer-message-received", message);
    }
  },
  closeWindow() {
    viewerWindow && !viewerWindow.isDestroyed() && viewerWindow.close();
    viewerWindow = null;
  },
  offlineOrOnline() {
    if (viewerWindow && viewerWindow.webContents) {
      return viewerWindow.webContents.getURL().startsWith("file") ? "offline" : "online";
    }
  }
};
