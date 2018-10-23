const messaging = require("common-display-module/messaging");
const scheduleParser = require("./schedule-parser");
const pingTimeout = 3000;
const uptimeInterval = 300000;

let schedule = null;
let ipcMain = null;
let rendererWindow = null;

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
    messaging.checkMessagingServiceConnection(),
    sendRendererPing()
  ])
  .then(([msResult])=>{
    const shouldBePlaying = scheduleParser.canPlay(schedule);
    const connectedToMS = msResult === 'connected';
    log.file('uptime', JSON.stringify({shouldBePlaying, connectedToMS}));
  })
  .catch((e)=>{
    log.file('uptime', e.message);
  });
}

function setRendererWindow(_rendererWindow) {
  rendererWindow = _rendererWindow;
}

function sendRendererPing() {
  if (!rendererWindow || rendererWindow.isDestroyed()) {
    return Promise.reject(Error("No renderer"));
  }

  return new Promise((res, rej)=>{
    const pongTimeoutTimer = setTimeout(()=>{
      ipcMain.removeAllListeners("renderer-pong");
      rej(Error("renderer-ping-timeout"));
    }, pingTimeout);

    ipcMain.once("renderer-pong", ()=>{
      clearTimeout(pongTimeoutTimer);
      res();
    });

    rendererWindow.webContents.send("renderer-ping");
  });
}

module.exports = {
  setSchedule,
  calculate,
  init,
  setRendererWindow
};
