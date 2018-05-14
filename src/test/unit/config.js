const assert = require("assert"),
simpleMock = require("simple-mock"),
mock = simpleMock.mock,
platform = require("rise-common-electron").platform,
commonConfig = require("common-display-module"),
network = require("rise-common-electron").network,
config = require("../../main/player/config.js");

mock(network, "registerProxyUpdatedObserver");

describe("Config", ()=>{
  afterEach(()=>{
    simpleMock.restore();
  });

  it("returns the correct rise cache version", ()=>{
    assert(/\d\.\d\./.test(config.cacheVersion));
  });

  it("sets and retrieves serial number", ()=> {
    let app = {
      on: simpleMock.stub(),
      makeSingleInstance: simpleMock.stub(),
      getAppPath: simpleMock.stub().returnWith("/fake/app/path"),
      quit: simpleMock.stub(),
      commandLine: {appendSwitch() {}, reset() {}}
    };
    mock(platform, "readTextFileSync").returnWith("CYN123123123");
    config.setSerialNumber(app);
    assert(config.getSerialNumber(), "CYN123123123");
  });

  it("sets and retrieves RLS usage for single file", ()=> {
    mock(platform, "readTextFileSync").returnWith(false);
    config.setRLSUsage();
    assert(!config.canUseRLSSingleFile());
    assert(!config.canUseRLSFolder());

    mock(platform, "readTextFileSync").returnWith(true);
    config.setRLSUsage();
    assert(config.canUseRLSSingleFile());
    assert(config.canUseRLSFolder());
  });

  it("returns player graceful shutdown flag path", ()=>{
    mock(commonConfig, "getInstallDir").returnWith("root");
    let flagPath = config.getPlayerGracefulShutdownPath();
    assert.equal(flagPath, "root/graceful_shutdown_flag");
  });

  it("saves player graceful shutdown flag", ()=>{
    mock(commonConfig, "writeFile").returnWith();

    config.setGracefulShutdownFlag();
    assert(commonConfig.writeFile.called);
    assert.equal(commonConfig.writeFile.lastCall.args[0], "graceful_shutdown_flag");
    assert.equal(commonConfig.writeFile.lastCall.args[1], "");
  });
});
