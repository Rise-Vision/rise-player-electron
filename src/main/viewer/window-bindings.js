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
  sendToRenderer(channel) {
    if (!viewerWindow || viewerWindow.isDestroyed()) {return;}

    const contents = viewerWindow.webContents;

    if (contents.isLoading()) {
      contents.on("did-finish-load", ()=>{
        contents.send(channel);
      });
    } else {
      contents.send(channel);
    }
  },
  closeWindow() {
    viewerWindow && !viewerWindow.isDestroyed() && viewerWindow.close();
    viewerWindow = null;
  },
  offlineOrOnline() {
    if (viewerWindow && viewerWindow.webContents) {
      const url = viewerWindow.webContents.getURL();
      return url.startsWith("file") && !url.endsWith("black-screen.html") ?
        "offline" : "online";
    }
  }
};
