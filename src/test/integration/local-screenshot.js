global.log = global.log || {
  all() {}, file() {}, error() {}, external() {}, debug: console.log
};

const assert = require("assert");
const child = require("child_process");
const commonConfig = require("common-display-module");
const messaging = require("common-display-module/messaging");
const fs = require("fs");
const simple = require("simple-mock");
const electron = require("electron");
const {BrowserWindow, app, globalShortcut, ipcMain, nativeImage} = require("electron");

const screenshot = require("../../main/player/screenshot");
const viewerController = require("../../main/viewer/controller");
const configLogger = require("../../main/loggers/config-logger.js");
const viewerWindowBindings = require("../../main/viewer/window-bindings");

describe("Local screenshot", function() {
  let win;

  const expectedPath = '/tmp/screenshot-123.png';

  beforeEach(() => {
    simple.mock(commonConfig, "getModulePath").returnWith("/tmp");
    simple.mock(configLogger,"logClientInfo").returnWith(true);
    simple.mock(messaging, "broadcastMessage").resolveWith();
    simple.mock(Date, "now").returnWith("123");
  });

  afterEach(() => {
    simple.restore();

    win && !win.isDestroyed() && win.close();
  });

  it("handles a local screenshot request", () => {
    screenshot.init(ipcMain, nativeImage);
    viewerController.init(BrowserWindow, app, globalShortcut, ipcMain, electron);

    return viewerController.launch("about:blank")
    .then(viewerWindow => {
      win = viewerWindow;

      viewerWindowBindings.setWindow(viewerWindow);

      return screenshot.handleLocalScreenshotRequest();
    })
    .then(() => {
      const fileProcess = child.spawnSync("file", [expectedPath]);
      const stdout = fileProcess.stdout.toString();

      assert(stdout.includes("PNG"));

      fs.unlinkSync(expectedPath);
    });
  });

});
