const assert = require("assert");
const simple = require("simple-mock");
const viewerController = require("../../../main/viewer/controller.js");
const commonConfig = require("common-display-module");
const network = require("rise-common-electron").network;
const onlineDetection = require("../../../main/player/online-detection");
const gcs = require("../../../main/player/gcs.js");
const viewerContentLoader = require("../../../main/viewer/content-loader.js");
const scheduleParser = require("../../../main/scheduling/schedule-parser");
const noViewerSchedulePlayer = require("../../../main/scheduling/schedule-player");
const messaging = require("../../../main/player/messaging.js");
const mocks = {};

let viewerMessageHandler;

mocks.app = {
  getAppPath: simple.stub().returnWith("/fake/app/path")
};

mocks.webContents = {
  on: simple.spy((evt, fn)=>{if(evt === "did-finish-load"){fn();}}),
  isLoading: simple.stub().returnWith(false),
  send: simple.stub(),
  session: {setProxy: simple.stub(), setCertificateVerifyProc: simple.stub()},
  toggleDevTools: simple.stub(),
  getURL: simple.stub().returnWith("")
};

mocks.viewerWindow = {
  close: simple.stub(),
  on: simple.stub(),
  destroy: simple.stub(),
  loadURL: simple.stub(),
  webContents: mocks.webContents,
  isFocused: simple.stub(),
  setSize: simple.stub(),
  getContentSize: simple.stub().returnWith([800,600]),
  isDestroyed: simple.stub().returnWith(false),
  getBounds: simple.stub(),
  setBounds: simple.stub()
};

mocks.screen = {
  on: simple.stub(),
  getAllDisplays: simple.stub()
};

mocks.electron = {
  screen: mocks.screen,
  BrowserWindow: simple.stub().returnWith(mocks.viewerWindow)
};

mocks.globalShortcut = {
  register: simple.stub()
};

mocks.ipc = {
  on(evt, handler) {
    if (evt === "viewer-message") {viewerMessageHandler = handler;}
  }
};

describe("viewerController", ()=>{
  beforeEach(()=>{
    viewerController.init(mocks.electron.BrowserWindow, mocks.app, mocks.globalShortcut, mocks.ipc, mocks.electron);
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
      assert.throws(()=>viewerController.init(mocks.electron.BrowserWindow, mocks.app, mocks.globalShortcut, mocks.ipc));
    });

    it("does not throw when all imports provided", ()=>{
      assert.doesNotThrow(()=>viewerController.init(mocks.electron.BrowserWindow, mocks.app, mocks.globalShortcut, mocks.ipc, mocks.electron));
    });

    it("registers content-update listener", ()=>{
      simple.mock(messaging, "on");
      viewerController.init(mocks.electron.BrowserWindow, mocks.app, mocks.globalShortcut, mocks.ipc, mocks.electron);
      var call = messaging.on.calls[0];
      assert.equal(call.args[0], "content-update");
    });

  });

  describe("content update" ,()=>{
    beforeEach(()=>{
      simple.mock(viewerContentLoader, "setUpContent");
      simple.mock(log, "external");
      simple.mock(log, "debug");
      simple.mock(messaging, "on");
    });

    it("sends content to viewer when found", ()=>{
      const content = {"test-content": "test-content"};
      simple.mock(gcs, "getFileContents").resolveWith(content);
      viewerController.init(mocks.electron.BrowserWindow, mocks.app, mocks.globalShortcut, mocks.ipc, mocks.electron);

      return messaging.on.lastCall.args[1]().then(()=>{
        assert(gcs.getFileContents.called);
        assert.deepEqual(viewerContentLoader.setUpContent.lastCall.args[0], content);
        assert.equal(gcs.getFileContents.lastCall.args[1].useLocalData, true);
      });
    });

    it("does not send new content to viewer on error", ()=>{
      simple.mock(gcs, "getFileContents").rejectWith(404);
      viewerController.init(mocks.electron.BrowserWindow, mocks.app, mocks.globalShortcut, mocks.ipc, mocks.electron);

      return messaging.on.lastCall.args[1]().catch(()=>{
        assert(gcs.getFileContents.called);
        assert(!viewerContentLoader.sendToViewer.called);
      });
    });
  });

  function launchViewer(launchFn = viewerController.launch) {
    const launchPromise = launchFn();

    setImmediate(()=>{
      viewerMessageHandler("test", {message: "data-handler-registered"});
    });

    return launchPromise;
  }
  describe("launch", ()=>{
    beforeEach(()=>{
      simple.mock(mocks.webContents, "executeJavaScript").callbackWith(true);
      simple.mock(log, "all");
    });

    afterEach(()=>{
      simple.restore();
    });

    it("uses the url from the config file", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(true);

      let debugviewerurl = "http://override-dot-rvaviewer-test.appspot.com/Viewer.html?";
      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({debugviewerurl});

      return launchViewer()
      .then(()=>{
        console.log(mocks.viewerWindow.loadURL.calls);
        assert(mocks.viewerWindow.loadURL.calls[1].args[0].startsWith(debugviewerurl));
      });
    });

    it("uses the url from the config file correctly when it doesn't end with a question mark", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(true);

      let debugviewerurl = "http://override-dot-rvaviewer-test.appspot.com/Viewer.html";
      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({debugviewerurl});

      return launchViewer()
      .then(()=>{
        assert(mocks.viewerWindow.loadURL.calls[1].args[0].startsWith(debugviewerurl + "?"));
      });
    });

    it("creates a presentation window with correct URL", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(true);

      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return launchViewer()
      .then(()=>{
        assert(mocks.electron.BrowserWindow.called);
        assert(mocks.viewerWindow.loadURL.calls[1].args[0].includes("fakedisplay"));
      });
    });

    it("creates a no-viewer window", ()=>{
      simple.mock(onlineDetection, "isOnline").returnWith(true);
      simple.mock(scheduleParser, "hasOnlyNoViewerURLItems").returnWith(true);
      simple.mock(noViewerSchedulePlayer, "start").returnWith(true);

      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return launchViewer()
      .then(()=>{
        assert(mocks.electron.BrowserWindow.called);
        assert(noViewerSchedulePlayer.start.called);
        assert(mocks.viewerWindow.getContentSize.called);
      });
    });

    it("launches Viewer on automatic fullscreen mode", ()=>{
      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay",
        claimid: "fakeclaim"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return launchViewer()
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
      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay",
        claimid: "fakeclaim",
        screenwidth: "2000",
        screenheight: "1000"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return launchViewer()
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

    it("resets Viewer window when user provided resolution mode and a display has been added", ()=>{
      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay",
        claimid: "fakeclaim",
        screenwidth: "2000",
        screenheight: "1000"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return launchViewer()
      .then(()=>{
        const call = mocks.screen.on.calls.filter((call)=> call.args[0] === "display-added")[0];
        const handler = call.args[1];
        handler();
        assert.ok(mocks.viewerWindow.setBounds.called);
        const bounds = mocks.viewerWindow.setBounds.lastCall.args[0];
        assert.deepEqual(bounds, {x: 0, y:0, width: 2000, height: 1000});
      });
    });

    it("restarts viewer if it's unresponsive", ()=>{
      simple.mock(log, "external");
      return launchViewer()
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
      return launchViewer()
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
      return launchViewer()
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
      return launchViewer()
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
      return launchViewer()
      .then(()=>{
        assert.ok(mocks.viewerWindow.loadURL.lastCall.args[0].includes("file://"));
      });
    });

    it("binds dev-tools hotkey", ()=>{
      return launchViewer()
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

      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return launchViewer(viewerController.reload)
      .then(()=>{
        assert(mocks.electron.BrowserWindow.called);
        assert(mocks.viewerWindow.loadURL.calls[1].args[0].includes("fakedisplay"));
      });
    });

    it("launches Viewer", ()=>{
      simple.mock(gcs, "getFileContents").resolveWith({display: {test: "test"}});
      simple.mock(commonConfig, "getDisplaySettingsSync").returnWith({
        displayid: "fakedisplay",
        claimid: "fakeclaim"
      });

      simple.mock(network, "getLocalIP").resolveWith("test");

      return launchViewer(viewerController.reload)
        .then(()=>{
          assert(mocks.electron.BrowserWindow.called);
        });
    });

    it("sends display content to viewer", ()=>{
      simple.mock(network, "getLocalIP").resolveWith("test");
      simple.mock(gcs, "getFileContents").resolveWith({display: {test: "test"}});
      simple.mock(gcs, "getCachedFileContents").resolveWith({display: {test: "test"}});
      simple.mock(viewerContentLoader, "contentPath").returnWith("test/path");
      simple.mock(network, "httpFetch").rejectWith();
      simple.mock(messaging, "init").resolveWith();
      simple.mock(viewerController, "launch").resolveWith(mocks.viewerWindow);
      simple.mock(viewerContentLoader, "sendContentToViewer").returnWith();
      simple.mock(scheduleParser, "setContent").resolveWith({});
      simple.mock(scheduleParser, "hasOnlyNoViewerURLItems").returnWith(false);

      return viewerController.reload().then(()=>{
        assert.equal(gcs.getFileContents.lastCall.args[0], "test/path");
        assert(viewerContentLoader.sendContentToViewer.lastCall.args[0].display);
      });
    });
  });

  describe("ShowDuplicateError", ()=>{
    it("loads the duplicate url", ()=>{
      return launchViewer()
      .then(()=>{
        assert(mocks.viewerWindow.loadURL.called);
      });
    });
  });
});
