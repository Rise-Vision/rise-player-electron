var screenshot = require("../../main/player/screenshot.js"),
network = require("rise-common-electron").network,
assert = require("assert"),
simpleMock = require("simple-mock"),
messaging = require("../../main/player/messaging.js"),
ipcMain = {},
nativeImage = {createFromDataURL() {return {toJPEG() { return "jpeg";}};}},
clientId = "1324512",
mock = require("simple-mock").mock;

describe("Screenshot", function() {
  afterEach("clean mocks", ()=>{
    simpleMock.restore();
  });

  it("uploads a screenshot correctly", ()=>{
    var url = "test/file.jpg";

    mock(network, "httpFetch").resolveWith({ statusCode: 200 });

    mock(messaging, "on").returnWith(true);

    mock(ipcMain, "once").callbackWith(null, {thumbnail: "abcdef"});

    mock(messaging, "write").callFn(console.log);

    screenshot.init(ipcMain, nativeImage);
    screenshot.startListener();
    var messagingScreenshotRequestPromise = messaging.on.lastCall.args[1]({url, clientId});

    return messagingScreenshotRequestPromise.then(()=>{
      assert.equal(network.httpFetch.callCount, 1);
      assert.equal(network.httpFetch.lastCall.args[0], url);
      assert.equal(network.httpFetch.lastCall.args[1].body, "jpeg");
    });
  });

  it("fails to upload a screenshot", function() {
    global.secondMillis = 5;
    var url = "test/file.jpg";

    mock(network, "httpFetch").rejectWith({ statusCode: 404 });

    mock(messaging, "on").returnWith(true);

    mock(ipcMain, "once").callbackWith(null, {thumbnail: "abcdef"});

    mock(messaging, "write").callFn(console.log);

    screenshot.init(ipcMain, nativeImage);
    screenshot.startListener();
    var messagingScreenshotRequestPromise = messaging.on.lastCall.args[1]({url, clientId});

    return messagingScreenshotRequestPromise
    .then(()=>{
      assert.equal(network.httpFetch.callCount, 4);
      assert.equal(network.httpFetch.lastCall.args[0], url);
      assert.equal(messaging.write.lastCall.args[0].msg, "screenshot-failed");
    });
  });

  it("logs when viewer fails to capture", function() {
    mock(messaging, "on").returnWith(true);

    mock(ipcMain, "once").callbackWith(null, {err: "simulated failure message from viewer"});

    mock(messaging, "write").callFn(console.log);

    mock(log, "error").returnWith(true);

    screenshot.init(ipcMain, nativeImage);
    screenshot.startListener();
    var messagingScreenshotRequestPromise = messaging.on.lastCall.args[1]({});

    return messagingScreenshotRequestPromise
    .then(()=>{
      assert.equal(log.error.lastCall.args[0], "simulated failure message from viewer");
    });
  });
});
