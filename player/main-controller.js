const platform = require("rise-common-electron").platform,
moduleVersion = require("common-display-module").config.getModuleVersion,
proxy = require("rise-common-electron").proxy,
launcher = require("../player/launcher.js"),
config = require("../player/config.js"),
onlineDetection = require("../player/online-detection.js"),
flashPluginFileName = platform.isWindows() ? "pepflashplayer.dll" : "libpepflashplayer.so",
flashPluginPath = require("path").join(config.getInstallDir(), flashPluginFileName);

let app,
displaySettings,
ipc,
globalShortcut,
ui,
mainWindow,
BrowserWindow,
protocol;

function schemeHandler(request, callback) {
  let redirect = {
      method: request.method,
      url: request.url.slice(2)
    };

  if (request.method === "POST" || request.method === "PUT") {
    redirect.uploadData = {
      contentType: "application/json",
      data: request.uploadData ? request.uploadData[0].bytes.toString() : ""
    };
  }

  return callback( redirect );
}

function readyHandler() {
  log.file("started", `player version: ${moduleVersion()} - Display id: ${displaySettings.displayid || displaySettings.tempdisplayid}`);
  log.debug("Electron " + process.versions.electron);
  log.debug("Chromium " + process.versions.chrome);
  log.debug("App Path " + app.getAppPath());
  log.debug("app ready event received");

  protocol.registerHttpProtocol("rchttp", schemeHandler);
  protocol.registerHttpProtocol("rchttps", schemeHandler);

  onlineDetection.init(ipc, BrowserWindow);

  ipc.on("ui-pong", (event)=>{
    log.debug("UI is ready");
    log.setUIWindow(event.sender);
    config.setUIWindow(event.sender);
    config.setIPCMain(ipc);
    event.sender.send("version", moduleVersion());

    proxy.setEndpoint(displaySettings.proxy)
    .then(launcher.launch.bind(null, ui));
  });
}

module.exports = {
  init(imports) {
    var importKeys = ["app", "displaySettings", "ipc", "ui", "globalShortcut", "BrowserWindow", "protocol"];

    importKeys.forEach((key)=>{
      // Catches null and undefined
      if (imports[key] == null) {
        throw new Error("Missing import: " + key);
      }
    });

    app = imports.app;
    displaySettings = imports.displaySettings;
    ipc = imports.ipc;
    ui = imports.ui;
    globalShortcut = imports.globalShortcut;
    BrowserWindow = imports.BrowserWindow;
    protocol = imports.protocol;

    app.commandLine.appendSwitch("ppapi-flash-path", flashPluginPath);

    protocol.registerStandardSchemes(["rchttp", "rchttps"], {secure: true});

    app.on("ready", readyHandler);
    app.on("window-all-closed", module.exports.allClosed);
  },

  allClosed() {
    log.debug("All windows closed");
    log.external("all closed");

    setTimeout(()=>app.quit(), 3 * global.secondMillis);
  },

  mainWindow
};
