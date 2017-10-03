const childProcess = require("child_process");
const assert = require("assert");
const simpleMock = require("simple-mock");
const mock = simpleMock.mock;
const platform = require("rise-common-electron").platform;
const config = requireRoot("installer/config.js");
const restart = requireRoot("installer/restart.js");
const messaging = requireRoot("installer/messaging.js");
const message = { msg: "restart-request" };

describe("Restart", ()=>{
  beforeEach(()=>{
    mock(childProcess, "spawn").returnWith({ unref: simpleMock.stub() });
    mock(config, "getScriptsDir").returnWith("test_dir");
    mock(config, "setGracefulShutdownFlag").returnWith();
  });

  afterEach(()=>{
    simpleMock.restore();
  });

  it("calls the correct restart command on Windows", ()=>{
    mock(platform, "isWindows").returnWith(true);

    restart.restart();

    assert(config.setGracefulShutdownFlag.called);
    assert(childProcess.spawn.called);
    assert(childProcess.spawn.lastCall.args[0] === "cmd.exe");
    assert(childProcess.spawn.lastCall.args[1][0] === "/c");
    assert(childProcess.spawn.lastCall.args[1][1].indexOf("background.jse") >= 0);
    assert(childProcess.spawn.lastCall.returned.unref.called);
  });

  it("calls the correct restart command on Linux", ()=>{
    mock(platform, "isWindows").returnWith(false);

    restart.restart();

    assert(config.setGracefulShutdownFlag.called);
    assert(childProcess.spawn.called);
    assert(childProcess.spawn.lastCall.args[0].indexOf("start.sh") >= 0);
    assert(childProcess.spawn.lastCall.args[1].indexOf("--unattended") >= 0);
    assert(childProcess.spawn.lastCall.returned.unref.called);
  });

  it("correctly adds extra parameters to restart call", ()=>{
    mock(platform, "isWindows").returnWith(false);

    restart.restart([ "--test-parameter" ]);

    assert(config.setGracefulShutdownFlag.called);
    assert(childProcess.spawn.called);
    assert(childProcess.spawn.lastCall.args[1].indexOf("--test-parameter") >= 0);
  });

  it("correctly handles a restart request message", ()=>{
    mock(restart, "restart").returnWith();

    restart.startListener();

    messaging.injectMessage(message);

    assert(restart.restart.called);
  });
});
