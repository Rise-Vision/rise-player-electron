var platform = require("rise-common-electron").platform,
network = require("rise-common-electron").network,
launcher = require("../../player/launcher.js"),
messaging = require("../../player/messaging.js"),
screenshot = require("../../player/screenshot.js"),
restart = require("../../player/restart.js"),
reboot = require("../../player/reboot.js"),
gcs = require("../../player/gcs.js"),
networkCheck = require("../../player/network-check.js"),
riseCacheWatchdog = require("../../player/rise-cache-watchdog.js"),
assert = require("assert"),
simpleMock = require("simple-mock"),
mock = require("simple-mock").mock,
viewerContentLoader = require("../../viewer/content-loader.js"),
gcsPolling = require("../../player/gcs-polling"),
viewerController = require("../../player/controller.js"),
onlineDetection = require("../../player/online-detection.js"),
viewer = require("viewer"),
uiController;


global.log = require("rise-common-electron").logger();

describe("launcher", ()=>{
  beforeEach("setup mocks", ()=>{
    mock(platform, "writeTextFile").resolveWith();
    mock(platform, "writeTextFileSync").returnWith();
    mock(networkCheck, "checkSitesWithJava").resolveWith(0);
    mock(networkCheck, "checkSitesWithElectron").resolveWith();
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
