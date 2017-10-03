const duplicate = require("../../player/duplicate-id.js"),
messaging = require("../../player/messaging.js"),
viewerController = require("../../viewer/controller.js"),
watchdog = require("../../player/watchdog.js"),
simple = require("simple-mock"),
assert = require("assert");

global.log = global.log || {};

describe("Duplicate ID", ()=>{
  beforeEach("setup mocks", ()=>{
    simple.mock(log, "external").returnWith();
    simple.mock(viewerController, "showDuplicateIdError").returnWith();
    simple.mock(messaging, "disconnect").returnWith();
    simple.mock(watchdog, "quit").returnWith();
  });

  afterEach("clean mocks", ()=>{
    simple.restore();
  });

  it("exists", ()=>{
    assert.ok(duplicate);
  });

  it("logs to BQ", ()=>{
    duplicate.logToBQ();
    assert(log.external.called);
  });

  it("shows the duplicate error screen", ()=>{
    duplicate.updateViewer();
    assert(viewerController.showDuplicateIdError.called);
  });

  it("disconnects from messaging", ()=>{
    duplicate.disconnectFromMessaging();
    assert(messaging.disconnect.called);
  });

  it("quits watchdog since viewer will no longer be running", ()=>{
    duplicate.quitWatchdog();
    assert(watchdog.quit.called);
  });
});
