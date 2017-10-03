const childProcess = require("child_process");
const assert = require("assert");
const simpleMock = require("simple-mock");
const mock = simpleMock.mock;
const platform = require("rise-common-electron").platform;
const config = requireRoot("installer/config.js");
const reboot = requireRoot("installer/reboot.js");
const messaging = requireRoot("installer/messaging.js");
const message = { msg: "reboot-request" };

describe("Reboot", ()=>{
  beforeEach(()=>{
    mock(childProcess, "spawn").returnWith({ unref: simpleMock.stub() });
    mock(config, "setGracefulShutdownFlag").returnWith();
  });

  afterEach(()=>{
    simpleMock.restore();
  });

  it("calls the correct reboot command on Windows", ()=>{
    mock(platform, "isWindows").returnWith(true);

    reboot.reboot();

    assert(config.setGracefulShutdownFlag.called);
    assert(childProcess.spawn.called);
    assert(childProcess.spawn.lastCall.args[0] === "shutdown");
    assert(childProcess.spawn.lastCall.args[1][0] === "-r");
    assert(childProcess.spawn.lastCall.args[1][1] === "-c");
    assert(childProcess.spawn.lastCall.returned.unref.called);
  });

  it("calls the correct reboot command on Linux", ()=>{
    mock(platform, "isWindows").returnWith(false);

    reboot.reboot();

    assert(config.setGracefulShutdownFlag.called);
    assert(childProcess.spawn.called);
    assert(childProcess.spawn.lastCall.args[0].indexOf("bash") >= 0);
    assert(childProcess.spawn.lastCall.args[1][0] === "-c");
    assert(childProcess.spawn.lastCall.args[1][1].indexOf("dbus-send") >= 0);
    assert(childProcess.spawn.lastCall.returned.unref.called);
  });

  it("correctly handles a reboot request message", ()=>{
    mock(reboot, "reboot").returnWith();

    reboot.startListener();

    messaging.injectMessage(message);

    assert(reboot.reboot.called);
  });
});
