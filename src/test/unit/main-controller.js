const platform = require("rise-common-electron").platform;
const mainController = require("../../main/player/main-controller.js");
const config = require("../../main/player/config.js");
const riseCacheWatchdog = require("../../main/player/rise-cache-watchdog.js");
const assert = require("assert");
const simple = require("simple-mock");
const mocks = {};

global.secondMillis = 5;
global.log = require("rise-common-electron").logger();

let readyHandler;

mocks.app = {
  on: simple.stub().callFn((evtName, handler)=>{if (evtName === "ready") {readyHandler = handler;}}),
  makeSingleInstance: simple.stub(),
  getAppPath: simple.stub().returnWith("/fake/app/path"),
  quit: simple.stub(),
  commandLine: {appendSwitch() {}, reset() {}}
};

mocks.ipc = {
  on: simple.stub()
};

mocks.webContents = {
  send: simple.stub()
};

mocks.mainWindow = {
  close: simple.stub(),
  isDestroyed: simple.stub(),
  webContents: mocks.webContents
};

mocks.ui = {
  init: simple.stub().returnWith(mocks.mainWindow),
  setRecoverableError: simple.stub(),
  showProxyOption: simple.stub(),
  showProgress: simple.stub(),
  startUnattended: simple.stub()
};

mocks.watchdog = {
  quit: simple.stub()
};

mocks.globalShortcut = {
  register: simple.stub(),
  isRegistered: simple.stub()
};

mocks.BrowserWindow = function() {
  return {on(){}, loadURL(){}};
};

mocks.protocol = {
  registerStandardSchemes: simple.stub(),
  registerHttpProtocol: simple.stub()
};

describe("mainController", ()=>{
  const imports = {
    app: mocks.app,
    displaySettings: {},
    globalShortcut: mocks.globalShortcut,
    ipc: mocks.ipc,
    ui: mocks.ui,
    watchdog: mocks.watchdog,
    BrowserWindow: mocks.BrowserWindow,
    protocol: mocks.protocol
  };

  beforeEach(()=>{
    simple.mock(riseCacheWatchdog, "quitCache").resolveWith();
    mainController.init(imports);
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

  it("exists", ()=>assert(!!mainController));

  describe("init", ()=>{

    it("throws when not all imports provided", ()=>{
      assert.throws(()=>mainController.init({app: {}}));
    });

    it("does not throw when all imports provided", ()=>{
      assert.doesNotThrow(()=>mainController.init(imports));
    });

    it("sets up app.on event handlers", ()=>{
      assert(mocks.app.on.calls[0].args[0] === "ready");
      assert(mocks.app.on.calls[1].args[0] === "window-all-closed");
    });

    it("registers 'rchttp' and 'rchttps' as standard schemes", ()=> {
      assert(mocks.protocol.registerStandardSchemes.called);
      assert(mocks.protocol.registerStandardSchemes.lastCall.args[0].toString() === "rchttp,rchttps");
      assert(mocks.protocol.registerStandardSchemes.lastCall.args[1].hasOwnProperty("secure"));
      assert(mocks.protocol.registerStandardSchemes.lastCall.args[1].secure === true);
    });

  });

  describe("allClosed", function() {
    beforeEach(()=>{
      simple.mock(log, "debug").callFn(console.log);
      simple.mock(log, "external").callFn(console.log);
    });
    afterEach(()=>{
      simple.restore();
    });
    it("quits app after a delay", (done)=>{
      mainController.allClosed();
      setTimeout(()=>{
        assert(mocks.app.quit.called);
        done();
      }, 500);
    });
  });

  describe("showUpgradeDelay", ()=>{
    it("eventually shows the continue button while waiting for an upgrade", ()=>{
    });
  });

  describe("ready", ()=>{
    beforeEach(()=>{
      simple.mock(config, "setSystemInfo").returnWith();
      simple.mock(mainController, "bindQuitAccelerator");
      simple.mock(log, "external");
      simple.mock(platform, "getHomeDir").returnWith("homedir");
      readyHandler();
    });

    afterEach(()=>{
      simple.restore();
    });

    it("registers protocols 'rchttp' and 'rchttps'", ()=>{
      assert(mocks.protocol.registerHttpProtocol.callCount === 2);

      assert(mocks.protocol.registerHttpProtocol.calls[0].args[0] === "rchttp");
      assert(mocks.protocol.registerHttpProtocol.calls[1].args[0] === "rchttps");

    });

    it("custom protocol handler for 'rchttp' executes correctly", () => {
      const handlerFn = mocks.protocol.registerHttpProtocol.calls[0].args[1],
        callback = simple.stub(), bytes = new ArrayBuffer(8);

      handlerFn({
        url: "rchttp://test.com",
        method: "GET"
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "http://test.com",
        method: "GET"
      });

      handlerFn({
        url: "rchttp://test.com",
        method: "POST",
        uploadData: [{
          bytes: bytes
        }]
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "http://test.com",
        method: "POST",
        uploadData: {
          contentType: "application/json",
          data: bytes.toString()
        }
      });

      handlerFn({
        url: "rchttp://test.com?file=https://storage.googleapis.com/risemedialibrary-abc123/test.webm",
        method: "GET",
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "http://test.com?file=https://storage.googleapis.com/risemedialibrary-abc123/test.webm",
        method: "GET"
      });
    });

    it("custom protocol handler for 'rchttp' appends the Rise Cache port to files URL", () => {
      const handlerFn = mocks.protocol.registerHttpProtocol.calls[0].args[1],
        callback = simple.stub();

      handlerFn({
        url: "rchttp://localhost?file=https://storage.googleapis.com/risemedialibrary-abc123/test.webm",
        method: "GET",
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "http://localhost:9494?file=https://storage.googleapis.com/risemedialibrary-abc123/test.webm",
        method: "GET"
      });
    });

    it("custom protocol handler for 'rchttp' appends the Rise Cache port to displays URL", () => {
      const handlerFn = mocks.protocol.registerHttpProtocol.calls[0].args[1],
        callback = simple.stub();

      handlerFn({
        url: "rchttp://localhost/displays",
        method: "GET",
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "http://localhost:9494/displays",
        method: "GET"
      });
    });

    it("custom protocol handler for 'rchttp' works when URL already has Rise Cache port", () => {
      const handlerFn = mocks.protocol.registerHttpProtocol.calls[0].args[1],
        callback = simple.stub();

      handlerFn({
        url: "rchttp://localhost:9494/displays",
        method: "GET",
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "http://localhost:9494/displays",
        method: "GET"
      });
    });

    it("protocol handler for 'rchttps' executes correctly", () => {
      const handlerFn = mocks.protocol.registerHttpProtocol.calls[1].args[1],
        callback = simple.stub(), bytes = new ArrayBuffer(8);

      handlerFn({
        url: "rchttps://test.com",
        method: "GET"
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "https://test.com",
        method: "GET"
      });

      handlerFn({
        url: "rchttps://test.com",
        method: "POST",
        uploadData: [{
          bytes: bytes
        }]
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "https://test.com",
        method: "POST",
        uploadData: {
          contentType: "application/json",
          data: bytes.toString()
        }
      });

      handlerFn({
        url: "rchttps://test.com?file=https://storage.googleapis.com/risemedialibrary-abc123/test.webm",
        method: "GET",
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "https://test.com?file=https://storage.googleapis.com/risemedialibrary-abc123/test.webm",
        method: "GET"
      });
    });

    it("custom protocol handler for 'rchttps' appends the Rise Cache port to files URL", () => {
      const handlerFn = mocks.protocol.registerHttpProtocol.calls[1].args[1],
        callback = simple.stub();

      handlerFn({
        url: "rchttps://localhost?file=https://storage.googleapis.com/risemedialibrary-abc123/test.webm",
        method: "GET",
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "https://localhost:9494?file=https://storage.googleapis.com/risemedialibrary-abc123/test.webm",
        method: "GET"
      });
    });

    it("custom protocol handler for 'rchttps' appends the Rise Cache port to displays URL", () => {
      const handlerFn = mocks.protocol.registerHttpProtocol.calls[1].args[1],
        callback = simple.stub();

      handlerFn({
        url: "rchttps://localhost/displays",
        method: "GET",
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "https://localhost:9494/displays",
        method: "GET"
      });
    });

    it("custom protocol handler for 'rchttps' works when URL already has Rise Cache port", () => {
      const handlerFn = mocks.protocol.registerHttpProtocol.calls[1].args[1],
        callback = simple.stub();

      handlerFn({
        url: "rchttps://localhost:9494/displays",
        method: "GET",
      }, callback);

      assert.deepEqual(callback.lastCall.args[0], {
        url: "https://localhost:9494/displays",
        method: "GET"
      });
    });

  });
});
