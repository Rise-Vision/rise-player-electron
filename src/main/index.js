const {app, session, protocol} = require("electron");
const electron = require("electron");
const ipc = require("electron").ipcMain;
const BrowserWindow = require("electron").BrowserWindow;
const commonConfig = require("common-display-module");
const globalShortcut = require("electron").globalShortcut;
const {network, proxy, platform} = require("rise-common-electron");
const nativeImage = require('electron').nativeImage;
const mainController = require("./player/main-controller");
const screenshot = require("./player/screenshot");
const uptime = require("./uptime/uptime");
const contentUptime = require("./uptime/content-uptime");
const config = require("./player/config");
const preventBQLog = process.env.RISE_PREVENT_BQ_LOG;
const viewerController = require("./viewer/controller");
const ElectronProxyAgent = require("electron-proxy-agent");
const externalLogger = require("./loggers/external-logger");
const path = require("path");

// Setting a different user data dir than the default one launcher uses, prevents web and service worker errors from happening.
const userDataDir = path.join(commonConfig.getInstallDir(), "chrome-user-data");
app.setPath('userData', userDataDir);

global.secondMillis = 1000;

global.log = require("rise-common-electron").logger(preventBQLog ? null : externalLogger, commonConfig.getModulePath(config.moduleName), `${config.moduleName}`);

log.resetLogFiles(Math.pow(10,5));

if(preventBQLog) { log.file("Environment variable RISE_PREVENT_BQ_LOG. Not logging to BQ."); }

const displaySettings = commonConfig.getDisplaySettingsSync();
log.setDisplaySettings(displaySettings);

process.on("uncaughtException", (err)=>{
  platform.writeTextFileSync(config.getUncaughtErrorFileName(), "player: Exception | " + require("util").inspect(err, {depth: 4}) + err.stack);
  app.quit();
});

process.on("unhandledRejection", (err)=>{
  platform.writeTextFileSync(config.getUncaughtErrorFileName(), "player: Rejection | " + require("util").inspect(err, {depth: 4}) + err.stack);
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

viewerController.init(BrowserWindow, app, globalShortcut, ipc, electron);

mainController.init({ app, displaySettings, ipc, globalShortcut, BrowserWindow, protocol });

screenshot.init(ipc, nativeImage);

uptime.init(ipc);
contentUptime.init();
