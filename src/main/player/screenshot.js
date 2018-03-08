const commonConfig = require("common-display-module");
const messaging = require("./messaging.js");
const platform = require("rise-common-electron").platform;
const request = require("request");
const viewerWindowBindings = require("../viewer/window-bindings.js");

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
        log.error("uploading screenshot", err);
        messaging.write({
          msg: "screenshot-failed",
          clientId: data.clientId
        });
      });
    });
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
  const {activeproxy} = commonConfig.getDisplaySettingsSync();

  return new Promise((resolve, reject)=>{
    request.put({
      url: signedUrl,
      body: contents,
      proxy: activeproxy,
      headers: {
        "Cache-Control": "public, max-age=0, no-cache, no-store"
      }
    }, (err, resp, body)=>{
      if(!err) {
        if(resp.statusCode !== 200) {
          log.file("Error uploading screenshot: " + resp.statusCode + " - " + body);
          reject(resp.statusCode);
        }
        else {
          resolve();
        }
      } else {
        reject(err);
      }
    });
  });
}
