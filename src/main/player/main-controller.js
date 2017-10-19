const platform = require("rise-common-electron").platform,
{proxy} = require("rise-common-electron"),
launcher = require("../player/launcher.js"),
config = require("./config.js"),
commonConfig = require("common-display-module"),
onlineDetection = require("../player/online-detection.js"),
flashPluginFileName = platform.isWindows() ? "pepflashplayer.dll" : "libpepflashplayer.so",
flashPluginPath = require("path").join(commonConfig.getInstallDir(), flashPluginFileName),
installer = require("./installer.js"),
path = require("path");

let app,
displaySettings,
ipc,
globalShortcut,
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
  const moduleVersion = commonConfig.getModuleVersion(config.moduleName);
  log.file("started", `player version: ${moduleVersion} - Display id: ${displaySettings.displayid || displaySettings.tempdisplayid}`);
  log.debug("Electron " + process.versions.electron);
  log.debug("Chromium " + process.versions.chrome);
  log.debug("App Path " + app.getAppPath());
  log.debug("app ready event received");

  protocol.registerHttpProtocol("rchttp", schemeHandler);
  protocol.registerHttpProtocol("rchttps", schemeHandler);

  module.exports.bindQuitAccelerator();

  onlineDetection.init(ipc, BrowserWindow);
  config.setSerialNumber(app);

  proxy.setSaveDir(commonConfig.getInstallDir());
  proxy.setEndpoint(displaySettings.proxy);
  launcher.launch();
}

module.exports = {
  init(imports) {
    var importKeys = ["app", "displaySettings", "ipc", "globalShortcut", "BrowserWindow", "protocol"];

    importKeys.forEach((key)=>{
      // Catches null and undefined
      if (imports[key] == null) {
        throw new Error("Missing import: " + key);
      }
    });

    app = imports.app;
    displaySettings = imports.displaySettings;
    ipc = imports.ipc;
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

  quit() {
    const scriptPath = path.join(commonConfig.getScriptDir(),
      platform.isWindows() ? "background.jse" : "stop.sh");
    const processCmd = platform.isWindows() ? "cmd" : scriptPath;
    const scriptArgs = platform.isWindows() ? ["/c", scriptPath, "stop.bat"] : [null];
    platform.launchExplorer();
    platform.startProcess(processCmd, scriptArgs);
    installer.quit();
  },

  bindQuitAccelerator() {
    const possibleKeys = ["Q", "K", "F4"];
    possibleKeys.some((key)=>{
      const accelerator = `CommandOrControl+Shift+${key}`;
      globalShortcut.register(accelerator, module.exports.quit);
      return globalShortcut.isRegistered(accelerator);
    }) || log.external("error", "could not register quit hotkey");
  },

  mainWindow
};
