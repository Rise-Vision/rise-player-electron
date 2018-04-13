const assert = require("assert");
const scheduledReboot = require("../../main/player/scheduled-reboot.js");
const simple = require("simple-mock");
global.log = global.log || {
  all(msg){console.log(msg);},
  debug(msg){console.log(msg);},
  file(msg){console.log(msg);},
  external(msg){console.log(msg);}
};

describe("Scheduled Reboot", ()=>{
  const validContents = {display: {restartEnabled: true, restartTime: "03:00"}};

  it("schedules reboot", ()=>{
    simple.mock(log, "debug");
    scheduledReboot.scheduleRebootFromViewerContents(validContents);
    assert(log.debug.called);
  });

  it("does not schedule if no content is provided", ()=>{
    simple.mock(log, "debug");
    scheduledReboot.scheduleRebootFromViewerContents();
    assert(!log.debug.called);
  });

  it("does not schedule if content does not include a display element", ()=>{
    simple.mock(log, "debug");
    scheduledReboot.scheduleRebootFromViewerContents({});
    assert(!log.debug.called);
  });

  it("does not schedule if restart is not enabled", ()=>{
    simple.mock(log, "debug");
    scheduledReboot.scheduleRebootFromViewerContents({display: {restartEnabled: false}});
    assert(!log.debug.called);
  });

  it("does not schedule if restart time is not present", ()=>{
    simple.mock(log, "external");
    scheduledReboot.scheduleRebootFromViewerContents({display: {restartEnabled: true}});
    assert(!log.debug.called);
    assert(log.external.lastCall.args[1].includes("invalid reboot schedule time"));
  });

  it("does not schedule if restart time is invalid", ()=>{
    let invalidContents = {display: {restartEnabled: true, restartTime: "0000"}};
    simple.mock(log, "external");
    scheduledReboot.scheduleRebootFromViewerContents(invalidContents);
    assert(!log.debug.called);
    assert(log.external.lastCall.args[1].includes("invalid reboot schedule time"));
  });
});
