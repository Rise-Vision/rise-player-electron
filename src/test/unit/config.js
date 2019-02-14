const assert = require("assert"),
simpleMock = require("simple-mock"),
mock = simpleMock.mock,
platform = require("rise-common-electron").platform,
commonConfig = require("common-display-module"),
network = require("rise-common-electron").network,
config = require("../../main/player/config.js");

mock(network, "registerProxyUpdatedObserver");

describe("Config", ()=>{
  let testSystemInfo = "hostname=testhost\ncpu=testcpu\nserial=testserial";

  afterEach(()=>{
    simpleMock.restore();
  });

  it("returns the correct rise cache version", ()=>{
    assert(/\d\.\d\./.test(config.cacheVersion));
  });

  it("sets and retrieves book pc serial number", ()=> {
    let app = {
      on: simpleMock.stub(),
      makeSingleInstance: simpleMock.stub(),
      getAppPath: simpleMock.stub().returnWith("/fake/app/path"),
      quit: simpleMock.stub(),
      commandLine: {appendSwitch() {}, reset() {}}
    };
    mock(platform, "readTextFileSync").returnWith("CYN123123123");
    config.setSystemInfo(app);
    assert(config.getSerialNumber(), "CYN123123123");
  });

  it("sets and retrieves system info serial number", ()=> {
    let app = {
      on: simpleMock.stub(),
      makeSingleInstance: simpleMock.stub(),
      getAppPath: simpleMock.stub().returnWith("/fake/app/path"),
      quit: simpleMock.stub(),
      commandLine: {appendSwitch() {}, reset() {}}
    };
    mock(platform, "readTextFileSync").returnWith(testSystemInfo);
    config.setSystemInfo(app);
    assert(config.getSerialNumber(), "testserial");
  });
  it("sets and retrieves hostname", ()=> {
    let app = {
      on: simpleMock.stub(),
      makeSingleInstance: simpleMock.stub(),
      getAppPath: simpleMock.stub().returnWith("/fake/app/path"),
      quit: simpleMock.stub(),
      commandLine: {appendSwitch() {}, reset() {}}
    };
    mock(config, "setBookPCSerialNumber").returnWith("");
    mock(platform, "readTextFileSync").returnWith(testSystemInfo);
    config.setSystemInfo(app);
    console.log(config.getHostname());
    assert(config.getHostname(), "testhostname");
  });

  it("sets and retrieves cpu", ()=> {
    let app = {
      on: simpleMock.stub(),
      makeSingleInstance: simpleMock.stub(),
      getAppPath: simpleMock.stub().returnWith("/fake/app/path"),
      quit: simpleMock.stub(),
      commandLine: {appendSwitch() {}, reset() {}}
    };
    mock(config, "setBookPCSerialNumber").returnWith("");
    mock(platform, "readTextFileSync").returnWith(testSystemInfo);
    config.setSystemInfo(app);
    assert(config.getCpu(), "testcpu");
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
