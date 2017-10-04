var assert = require("assert"),
  simpleMock = require("simple-mock"),
  mock = simpleMock.mock,
  platform = require("rise-common-electron").platform,
  config = require("../../../player/config.js"),
  installerLogger, bqClient;

describe("Installer logger", () => {

  beforeEach("setup", ()=> {
    mock(config, "getInstallDir").returnWith("test_dir");
    mock(config, "getDisplaySettingsSync").returnWith({ displayid: "test_display" });
    mock(platform, "getOSDescription").returnWith("os desc");
    mock(log, "file").returnWith();

    installerLogger = require("../../loggers/installer-logger.js");
    installerLogger.setDisplaySettings(config.getDisplaySettingsSync());

    bqClient = installerLogger.getBQClient();
  });

  afterEach(()=>{
    simpleMock.restore();
  });

  it("rejects the call if eventName is not provided", function() {
    return installerLogger.log()
      .then(()=>{
        throw Error("Should not be here");
      })
      .catch((err)=>{
        assert(err === "eventName is required");
      });
  });

  it("logs using temp display id if no real display id set up", function() {
    mock(bqClient, "insert").resolveWith();
    installerLogger.setDisplaySettings({tempdisplayid: "temp id"});
    return installerLogger.log("testEvent")
      .then(()=>{
        var calledWithId = bqClient.insert.lastCall.args[1].display_id;
        assert.equal(calledWithId, "temp id");
      });
  });

  it("logs using real display id if it exists", function() {
    mock(bqClient, "insert").resolveWith();
    installerLogger.setDisplaySettings({displayid: "real id"});
    return installerLogger.log("testEvent")
      .then(()=>{
        var calledWithId = bqClient.insert.lastCall.args[1].display_id;
        assert.equal(calledWithId, "real id");
      });
  });

  it("adds failed log entries on insert failure", ()=>{
    mock(bqClient, "insert").rejectWith();
    return installerLogger.log("testEvent")
      .then(()=>{
        assert.equal(Object.keys(installerLogger.pendingEntries()).length, 1);
      });
  });

});
