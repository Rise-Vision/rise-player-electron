const {ipcMain, BrowserWindow} = require("electron");
const onlineDetection = require("../../main/player/online-detection.js");
const assert = require("assert");

describe("Online Detection", ()=>{
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
