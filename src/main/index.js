var {app, session, protocol} = require("electron"),
fs = require("fs"),
ipc = require("electron").ipcMain,
BrowserWindow = require("electron").BrowserWindow,
commonConfig = require("common-display-module"),
globalShortcut = require("electron").globalShortcut,
{network, proxy, platform} = require("rise-common-electron"),
nativeImage = require('electron').nativeImage,
mainController = require("./player/main-controller.js"),
screenshot = require("./player/screenshot.js"),
config = require("./player/config.js"),
preventBQLog = process.env.RISE_PREVENT_BQ_LOG,
viewerController = require("./viewer/controller.js"),
ElectronProxyAgent = require("electron-proxy-agent"),
externalLogger = require("./loggers/external-logger.js"),
displaySettings;

global.secondMillis = 1000;

global.log = require("rise-common-electron").logger(preventBQLog ? null : externalLogger, commonConfig.getModulePath(config.moduleName), `${config.moduleName}`);

log.resetLogFiles(Math.pow(10,5));

if(preventBQLog) { log.file("Environment variable RISE_PREVENT_BQ_LOG. Not logging to BQ."); }

displaySettings = commonConfig.getDisplaySettingsSync();
log.setDisplaySettings(displaySettings);

setInterval(()=>{
  fs.writeFileSync("/home/rise/rvplayer/player-main-mem.out", Date() + "\n" + JSON.stringify(process.getProcessMemoryInfo(), null, 2) + "\n", {flag: "a"});
}, 5000);

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

mainController.init({ app, displaySettings, ipc, globalShortcut, BrowserWindow, protocol });

screenshot.init(ipc, nativeImage);
