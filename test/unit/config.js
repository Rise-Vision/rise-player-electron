const assert = require("assert"),
simpleMock = require("simple-mock"),
os = require("os"),
{join: pathJoin} = require("path"),
proxy = require("rise-common-electron").proxy,
mock = simpleMock.mock,
platform = require("rise-common-electron").platform,
network = require("rise-common-electron").network,
config = requireRoot("installer/config.js");

mock(network, "registerProxyUpdatedObserver");

describe("Config", ()=>{
  afterEach(()=>{
    simpleMock.restore();
  });

  it("returns the correct rise cache version", ()=>{
    assert(/\d\.\d\./.test(config.cacheVersion));
  });

  it("gets module path", ()=>{
    mock(config, "getInstallDir").returnWith("rvplayer");
    assert.equal(config.getModuleDir(), pathJoin("rvplayer", "modules"));
  });

  it("gets display settings synchronously", ()=>{
    mock(platform, "readTextFileSync").returnWith("something");
    assert(config.getDisplaySettingsSync().tempdisplayid);
  });

  it("fails to get display settings asynchronously if text file cannot be read", ()=>{
    return config.getDisplaySettings()
    .then(assert.fail)
    .catch(assert.ok);
  });
  it("succeeds in getting display settings asynchronously if text file is read", ()=>{
    mock(platform, "readTextFile").resolveWith("text=test");
    return config.getDisplaySettings()
    .then((resp)=>{
      assert.equal(resp.text, "test");
    })
    .catch(assert.fail);
  });
  it("logs externally if proxy settings could not be saved", ()=>{
    config.setUIWindow({send(){}, isDestroyed(){}});
    mock(platform, "writeTextFile").rejectWith();
    mock(log, "external").returnWith();
    proxy.setEndpoint("http://test.com");

    return Promise.resolve().then(()=>{
      assert.equal(log.external.callCount, 1);
    });
  });
  it("persists proxy settings with auth", ()=>{
    mock(platform, "writeTextFile").resolveWith();
    proxy.setEndpoint({
      hostname: "192.168.0.1",
      port: 80,
      username: "user",
      password: "pass"
    });

    assert.ok(platform.writeTextFile.lastCall.args[1].includes("http://user:pass@192.168.0.1:80"));
  });
  it("persists proxy settings without auth ", ()=>{
    mock(platform, "writeTextFile").resolveWith();
    proxy.setEndpoint({
      hostname: "192.168.0.1",
      port: 80
    });

    assert.ok(platform.writeTextFile.lastCall.args[1].includes("http://192.168.0.1:80"));
  });

  it("gets temporary directory", ()=>{
    mock(os, "tmpdir").returnWith("temp");

    config.getTempDir();

    assert(os.tmpdir.called);
  });

  it("sets and retrieves serial number", ()=> {
    let app = {
      on: simpleMock.stub(),
      makeSingleInstance: simpleMock.stub(),
      getAppPath: simpleMock.stub().returnWith("/fake/app/path"),
      quit: simpleMock.stub(),
      commandLine: {appendSwitch() {}, reset() {}}
    };
    mock(platform, "readTextFileSync").returnWith("CYN123123123");
    config.setSerialNumber(app);
    assert(config.getSerialNumber(), "CYN123123123");
  });

  it("returns a valid name for Windows installer name", ()=>{
    mock(config, "isWindows").returnWith(true);
    assert(config.getInstallerName());
  });

  it("returns a valid name for Linux installer name", ()=>{
    mock(config, "isWindows").returnWith(false);
    assert(config.getInstallerName());
  });

  it("returns a valid name for old Windows installer name", ()=>{
    mock(config, "isWindows").returnWith(true);
    assert(config.getOldInstallerName());
  });

  it("returns a valid name for old Linux installer name", ()=>{
    mock(config, "isWindows").returnWith(false);
    assert(config.getOldInstallerName());
  });

  it("executes a function that returns a promise on first run", ()=>{
    mock(config, "isFirstRun").returnWith(true);

    return Promise.resolve()
    .then(config.onFirstRun(()=>{return Promise.resolve(true);}))
    .then((itRan)=> {
      assert.ok(itRan);
    });
  });

  it("does not execute a function on other runs", ()=>{
    mock(config, "isFirstRun").returnWith(false);

    return Promise.resolve()
    .then(config.onFirstRun(()=>{return Promise.resolve(true);}))
    .then((itRan)=> {
      assert.ok(!itRan);
    });
  });

  it("returns display settings file path", ()=>{
    var displaySettingsPath;
    mock(config, "getInstallDir").returnWith("root");
    displaySettingsPath = config.getDisplaySettingsPath();
    assert.equal(displaySettingsPath, "root/RiseDisplayNetworkII.ini");
  });

  it("returns player graceful shutdown flag path", ()=>{
    mock(config, "getInstallDir").returnWith("root");
    let displaySettingsPath = config.getPlayerGracefulShutdownPath();
    assert.equal(displaySettingsPath, "root/graceful_shutdown_flag");
  });

  it("saves player graceful shutdown flag", ()=>{
    mock(config, "writeFile").returnWith();

    config.setGracefulShutdownFlag();
    assert(config.writeFile.called);
    assert.equal(config.writeFile.lastCall.args[0], "graceful_shutdown_flag");
    assert.equal(config.writeFile.lastCall.args[1], "");
  });

  describe("updateDisplaySettings", ()=>{
    beforeEach(()=>{
      mock(platform, "writeTextFile").resolveWith();
      mock(platform, "readTextFileSync").returnWith("existing=data");
    });

    it("writes to RDNII", ()=>{
      return config.updateDisplaySettings({}).then(()=>{
        assert(platform.writeTextFile.called);
        assert(/rvplayer\/RiseDisplayNetworkII.ini$/.test(platform.writeTextFile.calls[0].args[0]));
      });
    });

    it("writes new properties", ()=>{
      return config.updateDisplaySettings({new: "data"}).then(()=>{
        assert(/new=data/.test(platform.writeTextFile.calls[0].args[1]));
      });
    });

    it("preserves existing data", ()=>{
      return config.updateDisplaySettings({new: "data"}).then (()=>{
        assert(/existing=data/.test(platform.writeTextFile.calls[0].args[1]));
      });
    });
  });
});
