const assert = require("assert"),
  fs = require("fs"),
  path = require("path"),
  simpleMock = require("simple-mock"),
  mock = simpleMock.mock,
  commonConfig = require("common-display-module"),
  widgetLogger = require("../../../loggers/widget-logger.js"),
  message = { message: "widget-log", table: "testTable", params: JSON.stringify({event: "Test"}), suffix: "20170612"},
  bqClient = widgetLogger.getBQClient();

describe("Widget logger", ()=>{
  beforeEach(()=>{
    mock(log, "file").returnWith();
  });

  afterEach(()=>{
    simpleMock.restore();

    let failedFilePath = path.join(commonConfig.getInstallDir(), widgetLogger.failedFileName());
    console.log("deleting " + failedFilePath);
    try {
      fs.unlinkSync(failedFilePath);
    } catch(e){
      if (e.message.startsWith("ENOENT")) {return;}
      console.dir(e);
    }
  });

  it("successfully inserts widget event data", ()=>{
    mock(bqClient, "insert").resolveWith();

    return widgetLogger.log(message)
      .then(()=>{
        assert(bqClient.insert.called);
        assert.equal(bqClient.insert.lastCall.args[1].event, "Test");
      });
  });

  it("adds failed log entries on insert failure", ()=>{
    mock(bqClient, "insert").rejectWith();

    return widgetLogger.log(message)
      .then(()=>{
        assert.equal(Object.keys(widgetLogger.pendingEntries()).length, 1);
      });
  });
});
