var screenshot = require("../../main/player/screenshot.js"),
request = require("request"),
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

    mock(request, "put").callbackWith(null, { statusCode: 200 });

    mock(messaging, "on").returnWith(true);

    mock(ipcMain, "once").callbackWith(null, {thumbnail: "abcdef"});

    mock(messaging, "write").callFn(console.log);

    screenshot.init(ipcMain, nativeImage);
    screenshot.startListener();
    var messagingScreenshotRequestPromise = messaging.on.lastCall.args[1]({url, clientId});

    return messagingScreenshotRequestPromise.then(()=>{
      assert.equal(request.put.callCount, 1);
      assert.equal(request.put.lastCall.args[0].url, url);
      assert.equal(request.put.lastCall.args[0].body, "jpeg");
    });
  });

  it("fails to upload a screenshot", function() {
    global.secondMillis = 5;
    var url = "test/file.jpg";

    mock(request, "put").callbackWith("err", { statusCode: 404 });

    mock(messaging, "on").returnWith(true);

    mock(ipcMain, "once").callbackWith(null, {thumbnail: "abcdef"});

    mock(messaging, "write").callFn(console.log);

    screenshot.init(ipcMain, nativeImage);
    screenshot.startListener();
    var messagingScreenshotRequestPromise = messaging.on.lastCall.args[1]({url, clientId});

    return messagingScreenshotRequestPromise
    .then(()=>{
      assert.equal(request.put.callCount, 4);
      assert.equal(request.put.lastCall.args[0].url, url);
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
      assert.equal(log.error.lastCall.args[1], "simulated failure message from viewer");
    });
  });
});
