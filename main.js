var {app, session, protocol} = require("electron"),
ipc = require("electron").ipcMain,
BrowserWindow = require("electron").BrowserWindow,
globalShortcut = require("electron").globalShortcut,
platform = require("rise-common-electron").platform,
network = require("rise-common-electron").network,
nativeImage = require('electron').nativeImage,
proxy = require("rise-common-electron").proxy,
mainController = require("./player/main-controller.js"),
screenshot = require("./player/screenshot.js"),
config = require("./player/config.js"),
preventBQLog = process.env.RISE_PREVENT_BQ_LOG,
ui = require("./player/ui/controller.js"),
viewerController = require("./viewer/controller.js"),
ElectronProxyAgent = require("electron-proxy-agent"),
externalLogger = require("./loggers/installer-logger.js"),
displaySettings;

global.secondMillis = 1000;

global.log = require("rise-common-electron").logger(preventBQLog ? null : externalLogger, config.getInstallDir());

log.resetLogFiles(Math.pow(10,5));

if(preventBQLog) { log.file("Environment variable RISE_PREVENT_BQ_LOG. Not logging to BQ."); }

displaySettings = config.getDisplaySettingsSync();
log.setDisplaySettings(displaySettings);

process.on("uncaughtException", (err)=>{
  platform.writeTextFileSync(config.getUncaughtErrorFileName(), "Exception | " + require("util").inspect(err, {depth: 4}) + err.stack);
  app.quit();
});

process.on("unhandledRejection", (err)=>{
  platform.writeTextFileSync(config.getUncaughtErrorFileName(), "Rejection | " + require("util").inspect(err, {depth: 4}) + err.stack);
  app.quit();
});

network.registerProxyUpdatedObserver((fields)=>{
  var newSession = session.fromPartition(String(Math.random()));

  if(fields.hostname) {
    newSession.setProxy({pacScript: proxy.pacScriptURL()}, ()=>{});
    log.debug("using pac on Node" + proxy.pacScriptURL());
  }

  var agent = new ElectronProxyAgent(newSession, fields.username, fields.password);

  network.setNodeAgents(agent, agent);
});

viewerController.init(BrowserWindow, app, globalShortcut, ipc);

mainController.init({ app, displaySettings, ipc, ui, globalShortcut, BrowserWindow, protocol });

screenshot.init(ipc, nativeImage);
