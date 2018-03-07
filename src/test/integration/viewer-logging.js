const {BrowserWindow, app, globalShortcut} = require("electron");
const assert = require("assert");
const simple = require("simple-mock");
const offlineCheck = require("../../main/player/offline-restart-check");
const viewerController = require("../../main/viewer/controller");
const { ipcRenderer, ipcMain } = require('electron-ipc-mock')();
global.log = require("rise-common-electron").logger();

describe("Viewer logging",()=>{
  let win;

  before(()=>{
    simple.mock(offlineCheck, "startOfflineTimeoutIfRpp").resolveWith();

    viewerController.init(BrowserWindow, app, globalShortcut, ipcMain);
    viewerController.launch().then((viewerWindow)=>{win = viewerWindow;});
  });

  after(()=>{
    win && !win.isDestroyed() && win.close();
  });

  beforeEach(() => {
    simple.mock(log,"debug").returnWith(true);
    simple.mock(offlineCheck, "startOfflineTimeoutIfRpp").resolveWith();
  });

  afterEach(()=>{
    simple.restore();
  });

  it("should log to apps events", (done)=>{
    let serviceUrl = "https://www.googleapis.com/bigquery/v2/projects/client-side-events/datasets/Apps_Events/tables/app_events20170615/insertAll";
    ipcRenderer.send("viewer-message", {message: "viewer-log", serviceUrl: serviceUrl});

    setTimeout(()=>{
      assert.equal(log.debug.lastCall.args[0], `Logging to app_events20170615`);
      done();
    }, 100);
  });

  it("should log to player data", (done)=>{
    let serviceUrl = "https://www.googleapis.com/bigquery/v2/projects/client-side-events/datasets/Player_Data/tables/events20170615/insertAll";
    ipcRenderer.send("viewer-message", {message: "viewer-log", serviceUrl: serviceUrl});

    setTimeout(()=>{
      assert.equal(log.debug.lastCall.args[0], `Logging to events20170615`);
      done();
    }, 100);
  });

  it("should log to viewer events", (done)=>{
    let serviceUrl = "https://www.googleapis.com/bigquery/v2/projects/client-side-events/datasets/Viewer_Events/tables/events20170615/insertAll";
    ipcRenderer.send("viewer-message", {message: "viewer-log", serviceUrl: serviceUrl});

    setTimeout(()=>{
      assert.equal(log.debug.lastCall.args[0], `Logging to events20170615`);
      done();
    }, 100);
  });
});
