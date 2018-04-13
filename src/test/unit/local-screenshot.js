const assert = require("assert");
const commonConfig = require("common-display-module");
const fs = require("fs");
const simple = require("simple-mock");

const screenshot = require("../../main/player/screenshot");
const viewerWindowBindings = require("../../main/viewer/window-bindings");

describe("Local screenshot", function() {

  beforeEach(() => {
    simple.mock(commonConfig, "getModulePath").returnWith("module/path");
    simple.mock(Date, "now").returnWith("123");
    simple.mock(fs, "writeFile");
    simple.mock(viewerWindowBindings, "sendToViewer");
  });

  afterEach(() => simple.restore());

  it("handles a local screenshot request", () => {
    const ipcMain = {
      once: (topic, action) => action(null, {thumbnail: ''})
    };
    const nativeImage = {
      createFromDataURL: () => ({
        toPNG: () => "PNG DATA"
      })
    };

    screenshot.init(ipcMain, nativeImage);

    simple.mock(fs, "writeFile").callFn((filePath, buffer, action) => {
      assert.equal(filePath, "module/path/screenshot-123.png");
      assert.equal(buffer, "PNG DATA");

      action();
    });

    return screenshot.handleLocalScreenshotRequest()
    .then(() => assert(fs.writeFile.called));
  });

});
