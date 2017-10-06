var assert = require("assert");
var simple = require("simple-mock");
var viewerWindowBindings = require("../../../main/viewer/window-bindings.js");
var mocks = {};

mocks.webContents = {
  on: simple.spy((evt, fn)=>{if(evt === "did-finish-load"){fn();}}),
  send: simple.stub(),
  session: {setProxy(){}},
  toggleDevTools: simple.stub()
};

mocks.viewerWindow = {
  close: simple.stub(),
  on: simple.stub(),
  destroy: simple.stub(),
  loadURL: simple.stub(),
  webContents: mocks.webContents,
  isFocused: simple.stub(),
  setSize: simple.stub(),
  isDestroyed: simple.stub().returnWith(false)
};

describe("viewerWindowBindings", ()=>{
  beforeEach(()=>{
    viewerWindowBindings.setWindow(mocks.viewerWindow);
  });

  afterEach(()=>{
    simple.restore();

    // Reset mocks
    Object.keys(mocks).forEach((mockName)=>{
      Object.keys(mocks[mockName]).forEach((key)=>{
        mocks[mockName][key].reset && mocks[mockName][key].reset();
      });
    });
  });

  it("exists", ()=>assert(!!viewerWindowBindings));

  describe("sendToViewer", ()=>{
    it("relays messages to Viewer through ipc", ()=>{
      viewerWindowBindings.sendToViewer("message");
      assert(mocks.webContents.send.called);
    });
  });

});
