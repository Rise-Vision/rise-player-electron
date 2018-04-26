const electron = require("electron");
const {BrowserWindow, app, globalShortcut, ipcMain, nativeImage} = require("electron");
const childProc = require("child_process");
const screenshot = require("../../main/player/screenshot.js");
const messaging = require("../../main/player/messaging.js");
const viewerWindowBindings = require("../../main/viewer/window-bindings.js");
const viewerController = require("../../main/viewer/controller.js");
const simple = require("simple-mock");
const assert = require("assert");
const random = Math.random();
const uploadURL = `https://storage.googleapis.com/e2e-test-dump/${random}`;

describe("Screenshot", ()=>{
  let win;

  after(()=>{
    win && !win.isDestroyed() && win.close();
  });

  afterEach("reset mocks", ()=>{
    simple.restore();
  });

  it("uploads a screenshot to gcs", ()=>{
    simple.mock(messaging, "on").callbackWith({url: uploadURL});
    simple.mock(messaging, "write").callFn(console.log);
    simple.mock(log, "debug").callFn(console.log);
    simple.mock(log, "error").callFn(console.error);
    screenshot.init(ipcMain, nativeImage);
    viewerController.init(BrowserWindow, app, globalShortcut, ipcMain, electron);

    return viewerController.launch("about:blank")
    .then((viewerWindow)=>{return (win = viewerWindow);})
    .then(viewerWindowBindings.setWindow)
    .then(screenshot.startListener)
    .then(verifyFileUploaded);
  });
});

function verifyFileUploaded() {
  screenshot.startListener();

  return waitForGCSFile().then(downloadGCSFile).then(confirmValidJPEG);
}

function waitForGCSFile() {
  return new Promise((res)=>{
    setTimeout(()=>{
      console.log(`waiting for file e2e-test-dump/${random} to appear on GCS`);

      let spawnCmd = childProc.spawnSync("gsutil", ["ls", `gs://e2e-test-dump/${random}`]);
      let gsutilLSOutput = spawnCmd.stdout.toString();
      console.log(gsutilLSOutput);
      if (gsutilLSOutput.includes(random)) {
        return res();
      }
      return res(waitForGCSFile());
    }, 200);
  });
}

function downloadGCSFile() {
  console.log("downloading screenshot from gcs");
  return new Promise((res)=>{
    childProc.spawnSync("gsutil", ["cp", `gs://e2e-test-dump/${random}`, "."]);
    res();
  });
}

function confirmValidJPEG() {
  assert(childProc.spawnSync("file", [random]).stdout.toString().includes("JPEG"));
  require("fs").unlinkSync(random.toString());
}
