const assert = require("assert"),
simpleMock = require("simple-mock"),
mock = simpleMock.mock,
platform = require("rise-common-electron").platform,
network = require("rise-common-electron").network,
config = require("../../../main/player/config.js"),
commonConfig = require("common-display-module"),
configLogger = require("../../../main/loggers/config-logger.js"),
message = { message: "viewer-config", viewerVersion: "viewerVersion", width: 1280, height: 1024 },
offlineSubscriptionCheck = require("../../../main/player/offline-subscription-check.js");

mock(network, "registerProxyUpdatedObserver");

describe("Config logger", ()=>{
  beforeEach(()=>{
    mock(network, "getLocalIP").resolveWith("192.168.0.1");
    mock(commonConfig, "getDisplaySettingsSync").returnWith({ displayid: "test_display" });
    mock(config, "getInstallDir").returnWith("test_dir");
    mock(commonConfig, "fileExists").returnWith(true);
    mock(commonConfig, "writeFile").returnWith(true);
    mock(commonConfig, "getModuleVersion").returnWith("test");
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
        assert(commonConfig.writeFile.called);
        assert.equal(bqClient.insert.lastCall.args[1].viewer_version, "viewerVersion");
        assert.equal(bqClient.insert.lastCall.args[1].player_name, "RisePlayerElectron");
      });
  });

  it("should prefix player name with (Beta)", ()=>{
    let bqClient = configLogger.getBQClient();

    mock(configLogger, "stringify").returnWith("{}");
    mock(bqClient, "insert").resolveWith();
    mock(commonConfig, "isBetaLauncher").returnWith(true);

    return configLogger.logClientInfo(message)
      .then(()=>{
        assert.equal(bqClient.insert.lastCall.args[1].player_name, "(Beta) RisePlayerElectron");
      });
  });

  it("does not insert configuration data because it has not changed", ()=>{
    let bqClient = configLogger.getBQClient();

    mock(commonConfig, "fileExists").returnWith(true);
    mock(commonConfig, "readFile").returnWith("test");
    mock(configLogger, "stringify").returnWith("test");
    mock(bqClient, "insert").resolveWith();

    return configLogger.logClientInfo(message)
      .then(()=>{
        assert(!bqClient.insert.called);
        assert(!commonConfig.writeFile.called);
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
