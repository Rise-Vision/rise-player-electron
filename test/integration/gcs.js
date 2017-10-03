global.log = global.log || {file() {}, external() {}, debug: console.log};

const assert = require("assert");
const path = require("path");
const gcs = requireRoot("installer/gcs.js");
const simple = require("simple-mock");
const config = requireRoot("installer/config.js");
const localGCSFilePath = path.join(config.getInstallDir(), gcs.localGCSDataFileName);
const network = require("rise-common-electron").network;
const platform = require("rise-common-electron").platform;

describe("GCS", function() {
  this.timeout(10000);
  let remotePath = "risevision-display-notifications/xyz/command.json";

  afterEach(()=>{
    simple.restore();
  });

  function setStats(stats) {
    return platform.writeTextFile(localGCSFilePath, JSON.stringify(stats));
  }

  it("downloads and saves remote file contents when no previous data exists", ()=>{
    try{require("fs").unlinkSync(localGCSFilePath);}catch(e){}

    simple.mock(network, "httpFetch");
    simple.mock(platform, "writeTextFile");

    return gcs.getFileContents(remotePath)
    .then((contents)=>{
      assert.ok(contents.command);
      assert(network.httpFetch.callCount > 0);
      assert(JSON.parse(platform.writeTextFile.lastCall.args[1])[remotePath]);
    });
  });

  it("retrieves and saves new remote contents when remote file has changed", ()=>{
    return setStats({
      [remotePath]: {
        "generation": "-1",
        "lastFetch": 0,
        "content": {
          "test": "test" 
        }
      }
    })
    .then(()=> {
      return gcs.getFileContents(remotePath);
    })
    .then((contents)=>{
      assert.equal(contents.test, undefined);
      assert(contents.command);
      return new Promise((res)=>{
        setTimeout(res, 100);
      });
    })
    .then(()=>{
      assert(JSON.parse(config.readFile(gcs.localGCSDataFileName))[remotePath].generation !== "-1");
      assert(JSON.parse(config.readFile(gcs.localGCSDataFileName))[remotePath].content.command);
      assert(JSON.parse(config.readFile(gcs.localGCSDataFileName))[remotePath].lastFetch !== 0);
    });
  });

  it("uses local contents if the file was retrieved recently", ()=>{
    let fakeCommand = Math.random();
    return setStats({
      [remotePath]: {
        "generation": "-1",
        "lastFetch": (new Date()).getTime(),
        "content": {
          "test": fakeCommand 
        }
      }
    })
    .then(()=>{
      simple.mock(network, "httpFetch");

      return gcs.getFileContents(remotePath)
      .then((contents)=>{
        assert.equal(network.httpFetch.callCount, 0);
        assert.equal(contents.test, fakeCommand);
      });
    });
  });

  it("uses local contents if the remote file hasn't changed", ()=>{
    let fakeCommand = Math.random();

    return getCurrentGeneration()
    .then((currentGeneration)=>{
      return setStats({
        [remotePath]: {
          "generation": currentGeneration,
          "lastFetch": 0,
          "content": {test: fakeCommand}
        }
      });
    })
    .then(()=>{
      simple.mock(network, "httpFetch");
      return gcs.getFileContents(remotePath);
    })
    .then((contents)=>{
      assert.equal(network.httpFetch.callCount, 1);
      assert.equal(contents.test, fakeCommand);
    });

    function getCurrentGeneration() {
      return setStats({
        [remotePath]: {
          "generation": -1,
          "lastFetch": 0
        }
      })
      .then(()=>{
        return gcs.getFileContents(remotePath);
      })
      .then(()=>{
        return new Promise((res)=>{
          setTimeout(res, 100);
        });
      })
      .then(()=>{
        let currentGeneration = JSON.parse(config.readFile(gcs.localGCSDataFileName))[remotePath].generation;
        return currentGeneration;
      });
    }
  });

  it("tries multiple times and returns local data on failure", ()=>{
    simple.mock(gcs, "getFileContents");

    return gcs.getFileContents("risevision-display-notifications/xyz/XXXXXXXXX.json")
    .then((content)=>{
      assert.equal(gcs.getFileContents.callCount, 3);
      assert.ok(content);
    });
  });

  it("tries multiple times and rejects if file is not found and local data is not wanted", ()=>{
    simple.mock(gcs, "getFileContents");

    return gcs.getFileContents("risevision-display-notifications/xyz/XXXXXXXXX.json", {useLocalData: false})
    .then(()=>{assert.fail();})
    .catch((err)=>{
      assert.equal(gcs.getFileContents.callCount, 3);
      assert.equal(err.message, "Response code 401 (Unauthorized)");
    });
  });

  it("does not return local content if remote has not changed", ()=>{
    simple.mock(gcs, "getFileContents");

    return gcs.getFileContents(remotePath)
    .then(()=>{
      return gcs.getFileContents(remotePath, { useLocalData: false })
      .then((data)=>{
        assert(!data);
      });
    });
  });
});
