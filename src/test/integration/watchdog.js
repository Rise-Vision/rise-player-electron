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

server = http.createServer((request, response)=>{
  response.end("ok");
  endpointCalled = true;
  request.connection.end();
  request.connection.destroy();

  server.close();
});

server.on("error", console.error);
server.listen(port);

describe("watchdog", function () {
  this.timeout(6000);
  it("starts installer if it doesn't receive a ping within its delay  period", (done)=>{
    var scriptDir = path.join(os.tmpdir(), "watchdog-int-test");
    var startScriptPath = path.join(scriptDir, "start.sh");

    platform.writeTextFile(startScriptPath, startScript).then(()=>{
      fs.chmod(startScriptPath, "755");
      watchdog.init(["--delay", "1000", "--scriptDir", scriptDir]);
      setTimeout(()=>{
        assert(endpointCalled);
        done();
      }, 1500);
    });
  });
});
