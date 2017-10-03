const assert = require("assert"),
simpleMock = require("simple-mock"),
mock = simpleMock.mock,
platform = require("rise-common-electron").platform,
network = require("rise-common-electron").network,
config = require("../../../player/config.js"),
configLogger = require("../../../loggers/config-logger.js"),
message = { message: "viewer-config", viewerVersion: "viewerVersion", width: 1280, height: 1024 },
offlineSubscriptionCheck = requireRoot("installer/offline-subscription-check.js");

mock(network, "registerProxyUpdatedObserver");

describe("Config logger", ()=>{
  beforeEach(()=>{
    mock(network, "getLocalIP").resolveWith("192.168.0.1");
    mock(config, "getDisplaySettingsSync").returnWith({ displayid: "test_display" });
    mock(config, "getInstallDir").returnWith("test_dir");
    mock(config, "fileExists").returnWith(true);
    mock(config, "readFile").returnWith("test");
    mock(config, "writeFile").returnWith();
    mock(platform, "getOSDescription").returnWith("os desc");
    mock(offlineSubscriptionCheck, "isSubscribed").resolveWith();
  });

  afterEach(()=>{
    simpleMock.restore();
  });

  it("successfully inserts configuration data", ()=>{
    let bqClient = configLogger.getBQClient();

    mock(configLogger, "stringify").returnWith("{}");
    mock(bqClient, "insert").resolveWith();

    return configLogger.logClientInfo(message)
      .then(()=>{
        assert(bqClient.insert.called);
        assert(config.writeFile.called);
        assert.equal(bqClient.insert.lastCall.args[1].viewer_version, "viewerVersion");
      });
  });

  it("does not insert configuration data because it has not changed", ()=>{
    let bqClient = configLogger.getBQClient();

    mock(configLogger, "stringify").returnWith("test");
    mock(bqClient, "insert").resolveWith();

    return configLogger.logClientInfo(message)
      .then(()=>{
        assert(!bqClient.insert.called);
        assert(!config.writeFile.called);
      });
  });

  it("fails to insert configuration data", ()=>{
    let bqClient = configLogger.getBQClient();

    mock(bqClient, "insert").rejectWith();

    return configLogger.logClientInfo(message)
      .catch(()=>{
        assert(bqClient.insert.called);
      });
  });
});
