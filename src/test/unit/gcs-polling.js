const platform = require("rise-common-electron").platform;
const commonConfig = require("common-display-module");
const contentLoader = require("../../main/viewer/content-loader.js");
const messaging = require("../../main/player/messaging.js");
const gcs = require("../../main/player/gcs.js");
const assert = require("assert");
const simpleMock = require("simple-mock");
const mock = simpleMock.mock;

let gcsPolling = require("../../main/player/gcs-polling.js");

describe("GCS polling", ()=>{
  beforeEach(()=>{
    Object.keys(require.cache)
      .filter(key=>(key.includes("player/gcs-polling.js")))
      .forEach(el=>{delete require.cache[el];});

    mock(log, "file").returnWith();
    mock(log, "external").returnWith();
    mock(commonConfig, "getDisplaySettingsSync").returnWith({ displayid: "xyz" });

    gcsPolling = require("../../main/player/gcs-polling.js");
  });

  afterEach(()=>{
    simpleMock.restore();
  });

  it("initializes the module", ()=>{
    mock(gcsPolling, "refreshCommandsFileGeneration").returnWith();
    mock(messaging, "onEvent").returnWith();

    gcsPolling.init();

    assert.equal(messaging.onEvent.calls[0].args[1], gcsPolling.onConnected);
    assert.equal(messaging.onEvent.calls[1].args[1], gcsPolling.onDisconnected);

    assert(gcsPolling.refreshCommandsFileGeneration.called);
  });

  it("starts polling when messaging service is disconnected", ()=>{
    mock(gcsPolling, "pollGCS").returnWith();
    mock(gcsPolling, "getPollingInterval").returnWith(50);

    gcsPolling.init();

    messaging.injectEvent("ms-disconnected");

    return platform.waitForMillis(120)
    .then(()=>{
      assert.equal(gcsPolling.pollGCS.callCount, 2);
      messaging.injectEvent("ms-connected");
    });
  });

  it("stops polling when messaging service reconnects", ()=>{
    mock(gcsPolling, "pollGCS").returnWith();
    mock(gcsPolling, "getPollingInterval").returnWith(50);

    gcsPolling.init();

    messaging.injectEvent("ms-disconnected");
    return platform.waitForMillis(60)
      .then(()=>{
        assert.equal(gcsPolling.pollGCS.callCount, 1);

        messaging.injectEvent("ms-connected");
        return platform.waitForMillis(100);
      })
      .then(()=>{
        assert.equal(gcsPolling.pollGCS.callCount, 1);
      });
  });

  it("it polls for commands and content", ()=>{
    mock(gcsPolling, "processCommands").resolveWith();
    mock(gcsPolling, "fetchContent").resolveWith();

    return gcsPolling.pollGCS()
      .then(()=>{
        assert(gcsPolling.processCommands.called);
        assert(gcsPolling.fetchContent.called);
      });
  });

  it("it polls for content even if commands fetch failed", ()=>{
    mock(gcsPolling, "processCommands").rejectWith(new Error("error"));
    mock(gcsPolling, "fetchContent").resolveWith();

    return gcsPolling.pollGCS()
      .then(()=>{
        assert(gcsPolling.processCommands.called);
        assert(gcsPolling.fetchContent.called);
      });
  });

  it("it polls for content even if commands fetch failed because of 404, but does not log commands error", ()=>{
    mock(gcsPolling, "processCommands").rejectWith(new Error(404));
    mock(gcsPolling, "fetchContent").resolveWith();

    return gcsPolling.pollGCS()
      .then(()=>{
        assert(gcsPolling.processCommands.called);
        assert(gcsPolling.fetchContent.called);
      });
  });

  it("it polls for commands and content and does not fail even if both failed", ()=>{
    mock(gcsPolling, "processCommands").rejectWith(new Error("error"));
    mock(gcsPolling, "fetchContent").rejectWith(new Error("error"));

    return gcsPolling.pollGCS()
      .then(()=>{
        assert(gcsPolling.processCommands.called);
        assert(gcsPolling.fetchContent.called);
      });
  });

  it("it fetches commands and injects them in the messaging system", ()=>{
    mock(gcsPolling, "pollGCS").returnWith();
    mock(gcs, "getFileContents").resolveWith({ command: "restart" });
    mock(messaging, "injectMessage").resolveWith();

    gcsPolling.init();

    return gcsPolling.processCommands()
      .then(()=>{
        assert(gcs.getFileContents.called);
        assert(messaging.injectMessage.called);
        assert.equal(gcs.getFileContents.lastCall.args[0], "risevision-display-notifications/xyz/command.json");
        assert.equal(messaging.injectMessage.lastCall.args[0].message, "restart-request");
      });
  });

  it("it does not inject invalid messages in the messaging system", ()=>{
    mock(gcs, "getFileContents").resolveWith({ command: "invalid" });
    mock(messaging, "injectMessage").resolveWith();

    return gcsPolling.processCommands()
      .then(()=>{
        assert(gcs.getFileContents.called);
        assert(!messaging.injectMessage.called);
      });
  });

  it("it refreshes command file and discard the commands (used to ignore messages on startup)", ()=>{
    mock(gcs, "getFileContents").resolveWith({ command: "restart" });
    mock(messaging, "injectMessage").resolveWith();

    return gcsPolling.refreshCommandsFileGeneration()
      .then(()=>{
        assert(gcs.getFileContents.called);
        assert(!messaging.injectMessage.called);
      });
  });

  it("it refreshes command file and handles errors", ()=>{
    mock(gcs, "getFileContents").rejectWith(Error(404));
    mock(messaging, "injectMessage").resolveWith();

    return gcsPolling.refreshCommandsFileGeneration()
      .then(()=>{
        assert(gcs.getFileContents.called);
        assert(!messaging.injectMessage.called);
      });
  });

  it("fetches content and sends it to Viewer", ()=>{
    mock(contentLoader, "sendContentToViewer").resolveWith();
    mock(contentLoader, "contentPath").returnWith("/fake/content/path");
    mock(gcs, "getFileContents").resolveWith({ display: {} });

    return gcsPolling.fetchContent()
      .then(()=>{
        assert(gcs.getFileContents.called);
        assert(contentLoader.contentPath.called);
        assert(contentLoader.sendContentToViewer.called);
        assert(contentLoader.sendContentToViewer.lastCall.args[0].display);
      });
  });
});
