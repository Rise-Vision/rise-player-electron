const childProcess = require("child_process"),
path = require("path");

let watchdog;
let watchdogPingInterval;
let watchdogResponseTimeout;

module.exports = {
  init(delay) {
    const args = delay ?
            ["--delay", delay] :
            [];
    watchdog = childProcess.fork(path.join(__dirname, "..", "watchdog", "index.js"), args, {
      stdio: "inherit", detached: true
    });
    watchdog.unref();
    module.exports.initializeCommunication();
  },

  getWatchdog() {
    return watchdog;
  },

  send(message) {
    try {
      watchdog.send(message);
    } catch (err) { }
  },

  // Set up mainProcess-watchdog communication
  initializeCommunication() {
    // Send a ping every 5 seconds, wait 3 seconds for pong
    watchdogPingInterval = setInterval(()=>{
      module.exports.send({
        message: "ping",
        from: "mainProcess"
      });

      watchdogResponseTimeout = setTimeout(()=>{
        log.external("watchdog pong timeout");
      }, 3 * global.secondMillis);
    }, 5 * global.secondMillis);

    watchdog.on("message", (contents)=>{
      if (contents.message === "pong" && contents.to === "mainProcess") {
        clearTimeout(watchdogResponseTimeout);
      }
    });
  },

  quit() {
    clearInterval(watchdogPingInterval);
    clearTimeout(watchdogResponseTimeout);
    if (watchdog) {watchdog.kill();}
  }
};
