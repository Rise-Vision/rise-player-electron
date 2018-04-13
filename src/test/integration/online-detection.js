const {ipcMain, BrowserWindow} = require("electron");
const onlineDetection = require("../../main/player/online-detection");
const viewerWindowBindings = require("../../main/viewer/window-bindings");
const assert = require("assert");
const simple = require("simple-mock");

describe("Online Detection", ()=>{

  beforeEach(() => {
    simple.mock(viewerWindowBindings, "offlineOrOnline").returnWith("online");
  });

  afterEach(() => simple.restore());

  it("detects online status", ()=>{
    return onlineDetection.init(ipcMain, BrowserWindow)
    .then(()=>{
      assert(onlineDetection.isOnline());
    });
  });

  xit("detects offline status", ()=>{
    assert("this should be checked with manual testing");
  });
});
