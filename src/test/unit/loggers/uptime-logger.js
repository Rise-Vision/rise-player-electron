const assert = require("assert"),
  simpleMock = require("simple-mock"),
  mock = simpleMock.mock,
  uptimeLogger = require("../../../main/loggers/uptime-logger.js"),
  commonConfig = require("common-display-module"),
  bqClient = uptimeLogger.getBQClient();

describe("Uptime logger", ()=>{
  beforeEach(()=>{
    mock(log, "file").returnWith();
    mock(commonConfig, "getDisplaySettingsSync").returnWith({displayid: "test-id"});
  });

  afterEach(()=>{
    simpleMock.restore();
  });

  it("successfully inserts uptime event data", ()=>{
    mock(bqClient, "insert").resolveWith();

    return uptimeLogger.log(true, true, true)
      .then(()=>{
        assert(bqClient.insert.called);
        console.log(bqClient.insert.lastCall.args);
        assert.equal(bqClient.insert.lastCall.args[0], "events");
        assert.ok(bqClient.insert.lastCall.args[1].ts);
        assert.ok(bqClient.insert.lastCall.args[1].display_id);
        assert.equal(bqClient.insert.lastCall.args[1].connected, true);
        assert.equal(bqClient.insert.lastCall.args[1].showing, true);
        assert.equal(bqClient.insert.lastCall.args[1].scheduled, true);
      });
  });

  it("adds failed log entries on insert failure", ()=>{
    mock(bqClient, "insert").rejectWith();

    return uptimeLogger.log(true, true, true)
      .then(()=>{
        assert.equal(Object.keys(uptimeLogger.pendingEntries()).length, 1);
      });
  });
});
