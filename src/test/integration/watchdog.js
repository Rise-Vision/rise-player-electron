var assert = require("assert");
var http = require("http");
var path = require("path");
var fs = require("fs-extra");
global.log = require("rise-common-electron").logger();
var platform = require("rise-common-electron").platform;
var os = require("os");
var watchdog = require("../../main/player/watchdog.js");
var port = 9876;
var startScript = `#!/bin/bash
                   curl -s localhost:${port}`;
var server;
var endpointCalled;

before(()=>{
  server = http.createServer((request, response)=>{
    response.end("ok");
    endpointCalled = true;
    request.socket.unref();
    request.connection.end();
    request.connection.destroy();
    server.close();
  });

  server.on("error", console.error);
  server.unref();

  return new Promise(res=>server.listen(port, res));
});

describe("watchdog", function () {
  this.timeout(6000);
  it("starts installer if it doesn't receive a ping within its delay  period", ()=>{
    var scriptDir = path.join(os.tmpdir(), "watchdog-int-test");
    var startScriptPath = path.join(scriptDir, "start.sh");

    return platform.writeTextFile(startScriptPath, startScript)
    .then(()=>{
      return fs.chmod(startScriptPath, "755");
    })
    .then(()=>{
      watchdog.init(["--delay", "1000", "--scriptDir", scriptDir]);

      return new Promise(res=>setTimeout(res, 3500));
    })
    .then(()=>{
      assert(endpointCalled);
    });
  });
});
