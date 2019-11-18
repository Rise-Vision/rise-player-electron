const childProcess = require("child_process");
const inspect = require("util").inspect;
const path = require("path");

let watchdog;
let watchdogPingInterval;
let watchdogResponseTimeout;

module.exports = {
  init(overrideArgs = []) {
    watchdog = childProcess.fork(path.join(__dirname, "..", "watchdog", "index.js"), overrideArgs, {
      stdio: "inherit", detached: true
    });
    watchdog.unref();
    module.exports.initializeCommunication();
  },

  getWatchdog() {
    return watchdog;
  },

  send(message) {
    watchdog.send(message);
  },

  // Set up mainProcess-watchdog communication
  initializeCommunication() {
    // Send a ping every 20 seconds, wait 15 seconds for pong

    watchdogPingInterval = watchdogPingInterval || setInterval(()=>{
      watchdogResponseTimeout = watchdogResponseTimeout || setTimeout(()=>{
        log.external("watchdog pong timeout");
      }, 15 * global.secondMillis);

      module.exports.send({
        message: "ping",
        from: "mainProcess"
      });

    }, 20 * global.secondMillis);

    watchdog.on("message", (contents)=>{
      if (contents.message === "pong" && contents.to === "mainProcess") {
        clearTimeout(watchdogResponseTimeout);
        watchdogResponseTimeout = null;
      }
    });

    watchdog.on("error", (err) => {
      log.error(`error on watchdog process communication: ${ inspect(err) }`, "ping player watchdog");
    });
  },

  quit() {
    clearInterval(watchdogPingInterval);
    clearTimeout(watchdogResponseTimeout);
    watchdogResponseTimeout = null;
    watchdogPingInterval = null;
    if (watchdog) {watchdog.kill();}
  }
};
