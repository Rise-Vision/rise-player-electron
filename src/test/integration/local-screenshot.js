global.log = global.log || {all() {}, file() {}, external() {}, debug: console.log};

const assert = require("assert");
const child = require("child_process");
const commonConfig = require("common-display-module");
const messaging = require("common-display-module/messaging");
const fs = require("fs");
const path = require("path");
const simple = require("simple-mock");
const {BrowserWindow, app, globalShortcut, ipcMain, nativeImage} = require("electron");

const config = require("../../main/player/config");
const screenshot = require("../../main/player/screenshot");
const viewerController = require("../../main/viewer/controller");
const viewerWindowBindings = require("../../main/viewer/window-bindings");

const modulePath = commonConfig.getModulePath(config.moduleName);

describe("Local screenshot", function() {
  let win;

  const expectedPath = path.join(modulePath, 'screenshot-123.png');

  beforeEach(() => {
    simple.mock(messaging, "broadcastMessage").resolveWith();
    simple.mock(Date, "now").returnWith("123");
  });

  afterEach(() => {
    simple.restore();

    win && !win.isDestroyed() && win.close();
  });

  it("handles a local screenshot request", () => {
    screenshot.init(ipcMain, nativeImage);
    viewerController.init(BrowserWindow, app, globalShortcut, ipcMain);

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
