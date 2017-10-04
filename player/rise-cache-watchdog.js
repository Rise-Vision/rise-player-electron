const network = require("rise-common-electron").network;
const childProcess = require("child_process");
const cachePath = require.resolve("rise-cache-v2");
const cacheUrl = "http://127.0.0.1:9494/";
const checkInterval = 30 * 1000;
const inspect = require("util").inspect;
const riseCacheLogger = require("../player/loggers/rise-cache-logger");

let cache = null;

function scheduleCacheCheck() {
  setInterval(()=>{
    isCacheRunning()
      .catch((err)=>{
        log.external("restarting cache", inspect(err));
        module.exports.launchCache();
      });
  }, module.exports.getCheckInterval());
}

function isCacheRunning() {
  return network.httpFetch(cacheUrl, { timeout: 10000 })
    .then((res)=>{
      return res.json();
    })
    .then((res)=>{
      if(res.name === "rise-cache-v2") {
        return Promise.resolve();
      }
      else {
        return Promise.reject("Invalid Rise Cache response");
      }
    });
}

function startCache() {
  try {
    cache = childProcess.fork(cachePath, [], {
      stdio: "inherit",
      detached: true
    });

    cache.on("message", (data) => {
      riseCacheLogger.log(data);
    });
  }
  catch (err) {
    cache = null;
    log.error("starting rise cache v2", inspect(err));
  }
}

module.exports = {
  getCheckInterval() {
    return checkInterval;
  },
  launchCache() {
    startCache();
  },
  quitCache() {
    if (cache) { cache.send("quit"); }
  },
  startWatchdog() {
    scheduleCacheCheck();
  }
};
