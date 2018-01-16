const platform = require("rise-common-electron").platform;
const network = require("rise-common-electron").network;
const launcher = require("../../main/player/launcher.js");
const messaging = require("../../main/player/messaging.js");
const screenshot = require("../../main/player/screenshot.js");
const restart = require("../../main/player/restart.js");
const reboot = require("../../main/player/reboot.js");
const gcs = require("../../main/player/gcs.js");
const riseCacheWatchdog = require("../../main/player/rise-cache-watchdog.js");
const assert = require("assert");
const simpleMock = require("simple-mock");
const mock = require("simple-mock").mock;
const viewerContentLoader = require("../../main/viewer/content-loader.js");
const gcsPolling = require("../../main/player/gcs-polling");
const viewerController = require("../../main/viewer/controller.js");
const onlineDetection = require("../../main/player/online-detection.js");
const viewer = require("../../main/viewer");
const heartbeat = require("common-display-module/heartbeat");

let uiController = null;

global.log = require("rise-common-electron").logger();

describe("launcher", ()=>{
  beforeEach("setup mocks", ()=>{
    mock(platform, "writeTextFile").resolveWith();
    mock(platform, "writeTextFileSync").returnWith();
    mock(screenshot, "startListener").returnWith();
    mock(restart, "startListener").returnWith();
    mock(reboot, "startListener").returnWith();
    mock(viewerContentLoader, "sendContentToViewer").returnWith();
    mock(onlineDetection, "isOnline").returnWith(true);
    mock(gcsPolling, "init").returnWith();
    mock(riseCacheWatchdog, "launchCache").returnWith();
    mock(riseCacheWatchdog, "startWatchdog").returnWith();
    uiController = {
      showOffline: mock(),
      showFailedProxy: mock(),
      showInvalidDisplayId: mock()
    };
  });

  afterEach("clean mocks", ()=>{
    simpleMock.restore();
    heartbeat.stop();
  });

  it("launches Cache and presentation", ()=>{
    mock(platform, "getInstallDir").returnWith("test");
    mock(platform, "startProcess").returnWith();
    mock(platform, "waitForMillis").resolveWith();
    mock(platform, "killJava").resolveWith();
    mock(gcs, "getFileContents").resolveWith({display: {}});
    mock(network, "httpFetch").resolveWith();
    mock(messaging, "init").resolveWith();
    mock(viewer, "launch").resolveWith();

    return launcher.launch(uiController).then(()=>{
      assert.equal(platform.startProcess.callCount, 0);
      assert.equal(platform.waitForMillis.callCount, 2);
      assert(viewer.launch.called);
      assert(screenshot.startListener.called);
      assert(restart.startListener.called);
      assert(reboot.startListener.called);
      assert(messaging.init.called);
      assert(viewerContentLoader.sendContentToViewer.called);
      assert(gcsPolling.init.called);
    });
  });

  it("launches Cache even when stopping them fails", ()=>{
    mock(platform, "getInstallDir").returnWith("test");
    mock(platform, "startProcess").returnWith();
    mock(platform, "waitForMillis").resolveWith();
    mock(platform, "killJava").resolveWith();
    mock(gcs, "getFileContents").resolveWith({display: "abc123"});
    mock(network, "httpFetch").rejectWith();
    mock(messaging, "init").resolveWith();
    mock(viewer, "launch").resolveWith();

    return launcher.launch(uiController).then(()=>{
      assert.equal(platform.startProcess.callCount, 0);
      assert.equal(platform.waitForMillis.callCount, 2);
      assert(viewer.launch.called);
    });
  });

  it("logs error when initial content is not valid", ()=>{
    mock(platform, "getInstallDir").returnWith("test");
    mock(platform, "startProcess").returnWith();
    mock(platform, "waitForMillis").resolveWith();
    mock(platform, "killJava").resolveWith();
    mock(gcs, "getFileContents").resolveWith({notValid: ""});
    mock(network, "httpFetch").rejectWith();
    mock(messaging, "init").resolveWith();
    mock(viewer, "launch").resolveWith();
    mock(log, "external").returnWith();
    mock(log, "all").returnWith();

    return launcher.launch(uiController).catch(()=>{
      assert.equal(platform.startProcess.callCount, 0);
      assert.equal(platform.waitForMillis.callCount, 2);
      assert(viewer.launch.called);
      assert(log.all.called);
      assert.equal(log.all.lastCall.args[0], "no viewer content");
    });
  });

  it("sends display content to viewer", ()=>{
    mock(platform, "getInstallDir").returnWith("test");
    mock(platform, "startProcess").returnWith();
    mock(platform, "waitForMillis").resolveWith();
    mock(platform, "killJava").resolveWith();
    mock(gcs, "getFileContents").resolveWith({display: {test: "test"}});
    mock(viewerContentLoader, "contentPath").returnWith("test/path");
    mock(network, "httpFetch").rejectWith();
    mock(messaging, "init").resolveWith();
    mock(viewerController, "launch").resolveWith();

    return launcher.launch(uiController).then(()=>{
      assert.equal(gcs.getFileContents.lastCall.args[0], "test/path");
      assert(viewerContentLoader.sendContentToViewer.lastCall.args[0].display);
    });
  });
});
