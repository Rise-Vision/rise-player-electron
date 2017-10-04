var assert = require("assert");
var simple = require("simple-mock");
var viewerController = require("../../../viewer/controller.js");
var config = require("../../../player/config.js");
var network = require("rise-common-electron").network;
var onlineDetection = require("../../../player/online-detection");
var gcs = require("../../../player/gcs.js");
var viewerContentLoader = require("../../../viewer/content-loader.js");
var messaging = require("../../../player/messaging.js");
var mocks = {};

mocks.app = {
  getAppPath: simple.stub().returnWith("/fake/app/path")
};

mocks.webContents = {
  on: simple.spy((evt, fn)=>{if(evt === "did-finish-load"){fn();}}),
  send: simple.stub(),
  session: {setProxy: simple.stub(), setCertificateVerifyProc: simple.stub()},
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

mocks.electron = {
  BrowserWindow: simple.stub().returnWith(mocks.viewerWindow)
};

mocks.globalShortcut = {
  register: simple.stub()
};

mocks.ipc = {
  on(evt, handler) {
    handler("test", {message: "data-handler-registered"});
  }
};

describe("viewerController", ()=>{
  beforeEach(()=>{
    viewerController.init(mocks.electron.BrowserWindow, mocks.app, mocks.globalShortcut, mocks.ipc);
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

  it("exists", ()=>assert(!!viewerController));

  describe("init", ()=>{

    it("throws when not all imports provided", ()=>{
      assert.throws(()=>viewerController.init(mocks.electron.BrowserWindow));
      assert.throws(()=>viewerController.init(undefined, mocks.app));
      assert.throws(()=>viewerController.init(mocks.electron.BrowserWindow, mocks.app));
    });

    it("does not throw when all imports provided", ()=>{
      assert.doesNotThrow(()=>viewerController.init(mocks.electron.BrowserWindow, mocks.app, mocks.globalShortcut, mocks.ipc));
    });

  });

  describe("launch", ()=>{
    beforeEach(()=>{
      simple.mock(mocks.webContents, "executeJavaScript").callbackWith(true);
    });

    afterEach(()=>{
      simple.restore();
    });

    it("uses the url from the config file", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(true);

      let viewerurl = "http://override-dot-rvaviewer-test.appspot.com/Viewer.html?";
      simple.mock(config, "getDisplaySettingsSync").returnWith({viewerurl});

      return viewerController.launch()
      .then(()=>{
        console.log(mocks.viewerWindow.loadURL.calls);
        assert(mocks.viewerWindow.loadURL.calls[1].args[0].startsWith(viewerurl));
      });
    });

    it("uses the url from the config file correctly when it doesn't end with a question mark", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(true);

      let viewerurl = "http://override-dot-rvaviewer-test.appspot.com/Viewer.html";
      simple.mock(config, "getDisplaySettingsSync").returnWith({viewerurl});

      return viewerController.launch()
      .then(()=>{
        assert(mocks.viewerWindow.loadURL.calls[1].args[0].startsWith(viewerurl + "?"));
      });
    });

    it("creates a presentation window with correct URL", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(true);

      simple.mock(config, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return viewerController.launch()
      .then(()=>{
        assert(mocks.electron.BrowserWindow.called);
        assert(mocks.viewerWindow.loadURL.calls[1].args[0].includes("fakedisplay"));
      });
    });

    it("launches Viewer on automatic fullscreen mode", ()=>{
      simple.mock(config, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay",
        claimid: "fakeclaim"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return viewerController.launch()
      .then(()=>{
        assert(mocks.electron.BrowserWindow.called);
        assert.equal(mocks.electron.BrowserWindow.lastCall.args[0].fullscreen, true);
        assert.equal(mocks.electron.BrowserWindow.lastCall.args[0].center, true);
        assert(!mocks.electron.BrowserWindow.lastCall.args[0].x);
        assert(!mocks.electron.BrowserWindow.lastCall.args[0].y);
        assert(!mocks.electron.BrowserWindow.lastCall.args[0].enableLargerThanScreen);
        assert(!mocks.viewerWindow.setSize.called);
        assert(mocks.viewerWindow.webContents.session.setCertificateVerifyProc.called);
      });
    });

    it("launches Viewer on user provided resolution mode", ()=>{
      simple.mock(config, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay",
        claimid: "fakeclaim",
        screenwidth: "2000",
        screenheight: "1000"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return viewerController.launch()
      .then(()=>{
        assert(mocks.electron.BrowserWindow.called);
        assert.equal(mocks.electron.BrowserWindow.lastCall.args[0].fullscreen, false);
        assert.equal(mocks.electron.BrowserWindow.lastCall.args[0].center, false);
        assert.equal(mocks.electron.BrowserWindow.lastCall.args[0].x, 0);
        assert.equal(mocks.electron.BrowserWindow.lastCall.args[0].y, 0);
        assert.equal(mocks.electron.BrowserWindow.lastCall.args[0].enableLargerThanScreen, true);
        assert(mocks.viewerWindow.setSize.called);
        assert(mocks.viewerWindow.setSize.lastCall.args[0], 2000);
        assert(mocks.viewerWindow.setSize.lastCall.args[1], 1000);
        assert(mocks.viewerWindow.webContents.session.setCertificateVerifyProc.called);
      });
    });

    it("restarts viewer if it's unresponsive", ()=>{
      simple.mock(log, "external");
      return viewerController.launch()
      .then(()=>{
        var call = mocks.viewerWindow.on.calls.filter((call)=> call.args[0] === "unresponsive")[0];
        var handler = call.args[1];
        simple.mock(viewerController,"launch");
        handler();
        assert(viewerController.launch.called);
        assert(log.external.called);
        assert(mocks.viewerWindow.destroy.called);
      });
    });

    it("registers closed handler", ()=>{
      simple.mock(log, "debug");
      return viewerController.launch()
      .then(()=>{
        var call = mocks.viewerWindow.on.calls.filter((call)=> call.args[0] === "closed")[0];
        var handler = call.args[1];
        handler();
        assert(!viewerController.launch.called);
        assert(log.debug.called);
      });
    });

    it("registers crashed event", ()=>{
      simple.mock(log, "external");
      return viewerController.launch()
      .then(()=>{
        var call = mocks.webContents.on.calls.filter((call)=> call.args[0] === "crashed")[0];
        var handler = call.args[1];
        handler();
        assert(!viewerController.launch.called);
        assert(log.external.called);
      });
    });

    it("registers destroyed event", ()=>{
      simple.mock(log, "all");
      return viewerController.launch()
      .then(()=>{
        var call = mocks.webContents.on.calls.filter((call)=>call.args[0] === "destroyed")[0];
        var handler = call.args[1];
        handler();
        assert(!viewerController.launch.called);
        assert(log.all.called);
      });
    });

    it("launches the no-network screen when not connected", ()=>{
      simple.mock(mocks.webContents, "executeJavaScript").callbackWith(false);
      return viewerController.launch()
      .then(()=>{
        assert.ok(mocks.viewerWindow.loadURL.lastCall.args[0].includes("file://"));
      });
    });

    it("binds dev-tools hotkey", ()=>{
      return viewerController.launch()
      .then(()=>{
        var call = mocks.globalShortcut.register.calls.filter((call)=>call.args[0] === "CommandOrControl+Shift+.")[0];
        var handler = call.args[1];
        mocks.viewerWindow.isFocused.returnWith(true);
        handler();
        assert(mocks.webContents.toggleDevTools.called);
      });
    });
  });

  describe("reload", () => {
    beforeEach(()=>{
      simple.mock(mocks.webContents, "executeJavaScript").callbackWith(true);
    });

    afterEach(()=>{
      simple.restore();
    });

    it("creates a presentation window with correct URL", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(true);
      simple.mock(gcs, "getFileContents").resolveWith({display: {test: "test"}});

      simple.mock(config, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return viewerController.reload()
      .then(()=>{
        assert(mocks.electron.BrowserWindow.called);
        assert(mocks.viewerWindow.loadURL.calls[1].args[0].includes("fakedisplay"));
      });
    });

    it("launches Viewer", ()=>{
      simple.mock(gcs, "getFileContents").resolveWith({display: {test: "test"}});
      simple.mock(config, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay",
        claimid: "fakeclaim"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return viewerController.reload()
        .then(()=>{
          assert(mocks.electron.BrowserWindow.called);
        });
    });

    it("sends display content to viewer", ()=>{
      simple.mock(network, "getLocalIP").resolveWith("test");
      simple.mock(gcs, "getFileContents").resolveWith({display: {test: "test"}});
      simple.mock(viewerContentLoader, "contentPath").returnWith("test/path");
      simple.mock(network, "httpFetch").rejectWith();
      simple.mock(messaging, "init").resolveWith();
      simple.mock(viewerController, "launch").resolveWith(mocks.viewerWindow);
      simple.mock(viewerContentLoader, "sendContentToViewer").returnWith();

      return viewerController.reload().then(()=>{
        assert.equal(gcs.getFileContents.lastCall.args[0], "test/path");
        assert(viewerContentLoader.sendContentToViewer.lastCall.args[0].display);
      });
    });
  });

  describe("ShowDuplicateError", ()=>{
    it("loads the duplicate url", ()=>{
      return viewerController.launch()
      .then(()=>{
        assert(mocks.viewerWindow.loadURL.called);
      });
    });
  });
});
