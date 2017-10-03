var assert = require("assert");
var http = require("http");
var path = require("path");
var fs = require("fs-extra");
global.log = require("rise-common-electron").logger();
var platform = require("rise-common-electron").platform;
var config = requireRoot("installer/config.js");
var watchdog = requireRoot("installer/watchdog.js");
var version = requireRoot("version.json");
var installDir = config.getInstallDir(version);
var scriptDir = path.join(installDir, "Installer", "scripts");
var startScriptPath = path.join(scriptDir, "start.sh");
var port = 9876;
var startScript = `#!/bin/bash
                   curl -s localhost:${port}`;
var server;
var endpointCalled;

server = http.createServer((request, response)=>{
  response.end("ok");
  endpointCalled = true;
  request.connection.end();
  request.connection.destroy();

  server.close();
});

server.listen(port);

describe("watchdog", function () {
  this.timeout(6000);
  it("starts installer if it doesn't receive a ping within its delay  period", (done)=>{
    platform.writeTextFile(startScriptPath, startScript).then(()=>{
      fs.chmod(startScriptPath, "755");
      watchdog.init(1000);
      setTimeout(()=>{
        assert(endpointCalled);
        done();
      }, 1500);
    });
  });
});
