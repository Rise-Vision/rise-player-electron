var platform = require("rise-common-electron").platform;
var network = require("rise-common-electron").network;
var mainController = require("../../player/main-controller.js");
var display= ../../player/display-registration.js");
var proxy = require("rise-common-electron").proxy;
var config = require("../../player/config.js");
var networkCheck = require("../../player/network-check.js");
var onlineDetection = require("../../player/online-detection");
var launcher = require("../../player/launcher");
var riseCacheWatchdog = require("../../player/rise-cache-watchdog.js");
var assert = require("assert");
var simple = require("simple-mock");
var mocks = {};

global.secondMillis = 5;
global.log = require("rise-common-electron").logger();

mocks.app = {
  on: simple.stub(),
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
  return {loadURL(){}};
};

mocks.protocol = {
  registerStandardSchemes: simple.stub(),
  registerHttpProtocol: simple.stub()
};

describe("mainController", ()=>{
  var imports = {
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
    simple.mock(config, "updateDisplaySettings").resolveWith();
    simple.mock(launcher, "launch").resolveWith();
    simple.mock(riseCacheWatchdog, "quitCache").resolveWith();
    mainController.init(imports);
    simple.mock(networkCheck, "updateProxyConfig").resolveWith();
    simple.mock(networkCheck, "checkSitesWithJava").resolveWith();
    simple.mock(networkCheck, "checkSitesWithElectron").resolveWith(0);
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

    it("adds duplicate instance handler", ()=>{
      assert(mocks.app.makeSingleInstance.called);
      assert(mocks.app.makeSingleInstance.lastCall.args[0] === mainController.duplicateInstance);
    });

    it("sets up app.on event handlers", ()=>{
      assert(mocks.app.on.calls[0].args[0] === "ready");
      assert(mocks.app.on.calls[0].args[1] === mainController.ready);
      assert(mocks.app.on.calls[1].args[0] === "window-all-closed");
      assert(mocks.app.on.calls[1].args[1] === mainController.allClosed);
    });

    it("registers 'rchttp' and 'rchttps' as standard schemes", ()=> {
      assert(mocks.protocol.registerStandardSchemes.called);
      assert(mocks.protocol.registerStandardSchemes.lastCall.args[0].toString() === "rchttp,rchttps");
      assert(mocks.protocol.registerStandardSchemes.lastCall.args[1].hasOwnProperty("secure"));
      assert(mocks.protocol.registerStandardSchemes.lastCall.args[1].secure === true);
    });

  });

  describe("allClosed", function() {
    it("quits app after a delay", (done)=>{
      mainController.allClosed();
      setTimeout(()=>{
        assert(mocks.app.quit.called);
        done();
      }, 500);
    });
  });

  describe("duplicateInstance", ()=>{
    it("calls riseCacheWatchdog.quit", ()=> {
      mainController.duplicateInstance();
      assert(riseCacheWatchdog.quitCache.called);
    });

    it("calls app.quit", ()=>{
      mainController.duplicateInstance();
      assert(mocks.app.quit.called);
    });
  });

  describe("showUpgradeDelay", ()=>{
    it("eventually shows the continue button while waiting for an upgrade", ()=>{
    });
  });

  describe("ready", ()=>{
    beforeEach(()=>{
      simple.mock(config, "setSerialNumber").returnWith();
      simple.mock(mainController, "bindQuitAccelerator");
      simple.mock(log, "external");
      simple.mock(platform, "getHomeDir").returnWith("homedir");
      mainController.ready();
    });

    afterEach(()=>{
      simple.restore();
    });

    it("binds quit hotkey", ()=>{
      assert(mainController.bindQuitAccelerator.called);
    });

    it("registers set-proxy handler", ()=>{
      var call = mocks.ipc.on.calls.filter((call)=> call.args[0] === "set-proxy")[0];
      assert(call.args[1] === mainController.setProxy);
    });

    it("registers install handler", ()=>{
      var call = mocks.ipc.on.calls.filter((call)=> call.args[0] === "install")[0];
      assert(call.args[1] === mainController.install);
    });

    it("registers ui-pong handler", ()=>{
      var call = mocks.ipc.on.calls.filter((call)=> call.args[0] === "ui-pong")[0];
      var handler = call.args[1];
      assert(handler instanceof Function);
    });

    it("registers attendedReadyHook handler", ()=>{
      var call = mocks.ipc.on.calls.filter((call)=> call.args[0] === "attended-ready")[0];
      var handler = call.args[1];
      assert(handler = mainController.attendedReadyHook);
    });

    it("calls config.setSerialNumber", ()=>{
      assert(config.setSerialNumber.called);
      assert(config.setSerialNumber.lastCall.args[0] === mocks.app);
    });

    it("registers protocols 'rchttp' and 'rchttps'", ()=>{
      assert(mocks.protocol.registerHttpProtocol.callCount === 2);

      assert(mocks.protocol.registerHttpProtocol.calls[0].args[0] === "rchttp");
      assert(mocks.protocol.registerHttpProtocol.calls[1].args[0] === "rchttps");

    });

    it("custom protocol handler for 'rchttp' executes correctly", () => {
      let handlerFn = mocks.protocol.registerHttpProtocol.calls[0].args[1],
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

    it("protocol handler for 'rchttps' executes correctly", () => {
      let handlerFn = mocks.protocol.registerHttpProtocol.calls[1].args[1],
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

  });

  describe("setProxy", ()=>{
    it("should set proxy endoint when saving", ()=>{
      simple.mock(proxy, "setEndpoint").returnWith();
      mainController.setProxy(null, {});
      assert(proxy.setEndpoint.called);
    });
  });

  describe("install", ()=>{
    it("should try to upgrade if prereqCheck passes", (done)=>{
      simple.mock(mainController, "prereqCheck").resolveWith(true);
      simple.mock(installer, "tryUpgrade").resolveWith(true);

      mainController.install();

      setTimeout(()=>{
        assert(mainController.prereqCheck.called);
        assert(installer.tryUpgrade.called);
        done();
      });
    });

    it("should save display ID if provided", ()=>{
      simple.mock(installer, "tryUpgrade").resolveWith(true);
      return mainController.install("display-id")
      .then(()=>{
        assert(config.updateDisplaySettings.called);
        assert.equal(config.updateDisplaySettings.calls[0].args[0].displayid, "display-id");
      });
    });

    it("should not save display ID if not provided", ()=>{
      simple.mock(installer, "tryUpgrade").resolveWith(true);
      return mainController.install()
      .then(()=>{
        assert(!config.updateDisplaySettings.called);
      });
    });

  });

  describe("prereqCheck", ()=>{
    it("should resolve with false if CAP found", (done)=>{
      simple.mock(prereqs, "checkNoLegacyWatchdog").resolveWith();
      simple.mock(prereqs, "checkCAPNotInstalled").rejectWith();

      mainController.prereqCheck().then((result)=>{
        assert(result === false);
        done();
      });
    });
  });

  describe("installUnattended", ()=>{
    var event;

    beforeEach(()=>{
      event = {
        sender: {
          isDestroyed: simple.stub(),
          send: simple.stub()
        }
      };
    });

    it("should try to upgrade after 5 seconds", (done)=>{
      simple.mock(mainController, "prereqCheck").resolveWith(true);
      simple.mock(installer, "tryUpgrade").resolveWith(true);
      simple.mock(launcher, "launch").resolveWith();
      simple.mock(mainController, "postInstall").resolveWith(true);

      mainController.installUnattended(event);

      setTimeout(()=>{
        assert(mainController.prereqCheck.called);
        assert(mocks.ui.showProgress.called);
        assert(installer.tryUpgrade.called);
        done();
      }, 300);
    });

    it("should call ui.showProgess even if prereqCheck fails", (done)=>{
      simple.mock(mainController, "prereqCheck").resolveWith(false);
      simple.mock(installer, "tryUpgrade").resolveWith(true);
      simple.mock(launcher, "launch").resolveWith();

      mainController.installUnattended(event);

      setTimeout(()=>{
        assert(mocks.ui.showProgress.called);
        done();
      }, 300);
    });
  });


  describe("postInstall", ()=>{
    it("should resolve if options.withProxy = true", (done)=>{
      mainController.postInstall({withProxy: false})
        .then(done);
    });
  });

  describe("bindQuitAccelerator", ()=>{
    it("should register quit hotkey", ()=>{
      var handler;
      simple.mock(mocks.globalShortcut, "isRegistered").returnWith(true);
      simple.mock(platform, "startProcess").resolveWith(true);
      simple.mock(onlineDetection, "closeWindow").resolveWith(true);
      mainController.bindQuitAccelerator();
      assert(mocks.globalShortcut.register.called);
      assert.equal(mocks.globalShortcut.register.calls.length, 1);
      handler = mocks.globalShortcut.register.calls[0].args[1];
      handler();
      assert(platform.startProcess.called);
    });

    it("should log failure to register quit hotkey", ()=>{
      simple.mock(mocks.globalShortcut, "isRegistered").returnWith(false);
      simple.mock(log, "external");
      mainController.bindQuitAccelerator();
      assert(mocks.globalShortcut.register.called);
      assert.equal(mocks.globalShortcut.register.calls.length, 3);
      assert(log.external.called);
    });
  });

  describe("quit", ()=>{
    it("should not launch explorer if it hasn't been killed", ()=>{
      simple.mock(config, "getInstallerDir").returnWith("somepath");
      simple.mock(platform, "isWindows").returnWith(true);
      simple.mock(onlineDetection, "closeWindow").returnWith(true);
      simple.mock(platform, "launchExplorer").returnWith(true);

      mainController.quit();
      assert.equal(platform.launchExplorer.callCount, 0);
    });

    it("should launch explorer if it has been killed during unattended launch", ()=>{
      simple.mock(config, "getInstallerDir").returnWith("somepath");
      simple.mock(platform, "isWindows").returnWith(true);
      simple.mock(onlineDetection, "closeWindow").returnWith(true);
      simple.mock(platform, "launchExplorer").returnWith(true);
      simple.mock(platform, "killExplorer").resolveWith(true);
      simple.mock(mainController, "prereqCheck").resolveWith(true);
      simple.mock(installer, "tryUpgrade").resolveWith(true);
      simple.mock(launcher, "launch").resolveWith();
      simple.mock(mainController, "postInstall").resolveWith(true);

      return mainController.installUnattended()
      .then(mainController.quit)
      .then(()=>assert.equal(platform.launchExplorer.callCount, 1));
    });

    it("should launch explorer if it has been killed during attended launch", ()=>{
      simple.mock(log, "external");
      simple.mock(config, "getInstallerDir").returnWith("somepath");
      simple.mock(platform, "isWindows").returnWith(true);
      simple.mock(platform, "getHomeDir").returnWith("homedir");
      simple.mock(onlineDetection, "closeWindow").returnWith(true);
      simple.mock(onlineDetection, "init").returnWith(true);
      simple.mock(platform, "launchExplorer").returnWith(true);
      simple.mock(platform, "killExplorer").resolveWith(true);
      simple.mock(mainController, "prereqCheck").resolveWith(true);
      simple.mock(installer, "tryUpgrade").resolveWith(true);
      simple.mock(launcher, "launch").resolveWith();
      simple.mock(config, "setSerialNumber").returnWith();
      simple.mock(mainController, "postInstall").resolveWith(true);

      mainController.ready();

      let onLaunchCall = mocks.ipc.on.calls.find((call)=>{
        return call.args[0] === "launch";
      });

      let onLaunchCallback = onLaunchCall.args[1];

      return onLaunchCallback()
      .then(mainController.quit)
      .then(()=>assert.equal(platform.launchExplorer.callCount, 1));
    });
  });

  describe("submitClaimAndInstall", ()=>{
    it("calls install if registration succeeds", ()=>{
      simple.mock(mainController, "install").resolveWith();
      simple.mock(displayRegistration, "submitClaimId").resolveWith("DISPLAYID");
      simple.mock(installer, "setDisplayId").returnWith();
      return mainController.submitClaimAndInstall(null, {
        claimId: "id",
        name: "name"
      })
      .then(()=>assert(mainController.install.called));
    });

    it("doesn't call install if registration fails", ()=>{
      simple.mock(mainController, "install").resolveWith();
      simple.mock(displayRegistration, "submitClaimId").rejectWith();
      simple.mock(installer, "setDisplayId").returnWith();
      return mainController.submitClaimAndInstall(null, {
        claimId: "id",
        name: "name"
      })
      .then(()=>assert(!mainController.install.called));
    });
  });

  describe("submitClaimAndInstall", ()=>{
    it("calls install if validation succeeds", ()=>{
      simple.mock(mainController, "install").resolveWith();
      simple.mock(displayRegistration, "validateDisplayId").resolveWith();
      return mainController.validateDisplayAndInstall(null, { displayId: "id" })
      .then(()=>assert(mainController.install.called));
    });

    it("doesn't call install if validation fails", ()=>{
      simple.mock(mainController, "install").resolveWith();
      simple.mock(displayRegistration, "validateDisplayId").rejectWith({message: "message"});
      return mainController.validateDisplayAndInstall(null, { displayId: "id" })
      .then(()=>assert(!mainController.install.called));
    });
  });

  describe("attendedReadyHook", ()=>{
    beforeEach(()=>{
      simple.mock(network, "registerProxyUpdatedObserver");

    });

    it("sets error message to null", ()=>{
      mainController.attendedReadyHook();
      assert(mocks.ui.setRecoverableError.called);
      assert.equal(mocks.ui.setRecoverableError.calls[0].args[0], null);
    });
  });
});
