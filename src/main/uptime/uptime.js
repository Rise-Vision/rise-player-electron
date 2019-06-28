const messaging = require("common-display-module/messaging");
const investigation = require("./investigation");
const uptimeLogger = require("../loggers/uptime-logger");
const scheduleParser = require("../scheduling/schedule-parser");
const pingTimeout = 3000;
const uptimeInterval = 300000;

let schedule = null;
let ipcMain = null;
let rendererWindow = null;
let _isActive = true;

function setSchedule(data) {
  if (data && data.content && data.content.schedule) {
    schedule = data.content.schedule;
  }
}

function init(ipc) {
  ipcMain = ipc;
  setInterval(calculate, uptimeInterval);
}

function calculate() {
  if (!schedule) {
    log.error('schedule not set, cannot calculate uptime.');
    return;
  }

  Promise.all([
    messaging.checkMessagingServiceConnection().catch(e=>{
      log.error(e.message);
    }),
    checkRendererHealth()
  ])
  .then(([msResult, rendererResult])=>{
    const shouldBePlaying = scheduleParser.scheduledToPlay(schedule);
    const connectedToMS = msResult === 'connected';
    log.file('uptime', JSON.stringify({shouldBePlaying, connectedToMS, rendererResult}));

    if (!connectedToMS) {investigation.reportConnectivity();}
    uptimeLogger.log(connectedToMS, rendererResult, shouldBePlaying);

    _isActive = connectedToMS && rendererResult && shouldBePlaying;
  })
  .catch((e)=>{
    log.error(e.message);
  });
}

function setRendererWindow(_rendererWindow) {
  rendererWindow = _rendererWindow;
}

function checkRendererHealth() {
  if (!rendererWindow || rendererWindow.isDestroyed()) {
    log.file('uptime', 'no rendering window');
    return Promise.resolve(false);
  }

  return new Promise((res)=>{
    const pongTimeoutTimer = setTimeout(()=>{
      ipcMain.removeAllListeners("renderer-pong");
      log.file('uptime', 'rendering window timeout');
      res(false);
    }, pingTimeout);

    ipcMain.once("renderer-pong", ()=>{
      clearTimeout(pongTimeoutTimer);
      res(true);
    });

    rendererWindow.webContents.send("renderer-ping");
  });
}

function isActive() {
  return _isActive;
}

module.exports = {
  setSchedule,
  init,
  setRendererWindow,
  isActive
};
