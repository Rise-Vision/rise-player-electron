const commonConfig = require("common-display-module");
const commonMessaging = require("common-display-module/messaging");
const config = require("./config");
const fs = require("fs");
const messaging = require("./messaging");
const path = require("path");
const platform = require("rise-common-electron").platform;
const network = require("rise-common-electron").network;
const viewerWindowBindings = require("../viewer/window-bindings");

const JPEGQUALITY = 15;
let RETRIES_TIMEOUT_DELAY;

let ipcMain, nativeImage;

module.exports = {
  init(_ipcMain, _nativeImage) {
    ipcMain = _ipcMain;
    nativeImage = _nativeImage;
    RETRIES_TIMEOUT_DELAY = [3, 10 * global.secondMillis, 1 * global.secondMillis];
  },
  startListener() {
    messaging.on("screenshot-request", (data)=>{
      let displayId = commonConfig.getDisplaySettingsSync().displayid;

      return uploadScreenshot(decodeURI(data.url))
      .then(()=>{
        messaging.write({
          msg: "screenshot-saved",
          clientId: data.clientId
        });
        log.file(`screenshot uploaded - 'screenshot-saved' message sent to ${displayId}/${data.clientId}`);
      })
      .catch((err)=>{
        log.error(err, "uploading screenshot");
        messaging.write({
          msg: "screenshot-failed",
          clientId: data.clientId
        });
      });
    });

    messaging.onEvent('local-screenshot-request', module.exports.handleLocalScreenshotRequest);
  },
  handleLocalScreenshotRequest() {

    log.debug('local screenshot requested');

    return captureScreenshot()
    .then(screenshot => {
      const buffer = nativeImage.createFromDataURL(screenshot).toPNG();
      const modulePath = commonConfig.getModulePath(config.moduleName);
      const filePath = path.join(modulePath, `screenshot-${Date.now()}.png`);

      return writeFile(filePath, buffer);
    })
    .then(filePath => commonMessaging.broadcastMessage({
      from: config.moduleName, topic: 'local-screenshot-result', filePath
    }))
    .catch(error => log.error(error.stack, 'error while handling local screenshot request'));
  }
};

function uploadScreenshot(signedUrl) {
  return captureScreenshot()
  .then((thumbnail)=>{
    let JPEG = nativeImage.createFromDataURL(thumbnail).toJPEG(JPEGQUALITY);
    let uploadFunc = uploadBuffer.bind(null, signedUrl, JPEG);
    return platform.runFunction(uploadFunc, ...RETRIES_TIMEOUT_DELAY);
  });
}

function captureScreenshot() {
  return new Promise((res, rej)=>{
    ipcMain.once("viewer-screenshot-result", (evt, message)=>{
      if(message.err) {return rej(message.err);}
      res(message.thumbnail);
    });

    viewerWindowBindings.sendToViewer({msg: "viewer-screenshot-request"});
  });
}

function uploadBuffer(signedUrl, contents) {
  return network.httpFetch(signedUrl, {
    method: 'PUT',
    body: contents,
    headers: {
      "Cache-Control": "public, max-age=0, no-cache, no-store"
    }
  })
  .then((resp)=>{
    if (resp.statusCode !== 200) {
      log.file("Error uploading screenshot: " + resp.statusCode + " - " + resp.text());
      return Promise.reject(resp.statusCode);
    }
  });
}

function writeFile(filePath, buffer) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, buffer, error => {
      if (error) {
        return reject(error);
      }

      resolve(filePath);
    });
  });
}
