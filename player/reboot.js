const platform = require("rise-common-electron").platform;
const childProcess = require("child_process");
const config = require("../player/config.js");
const messaging = require("common-display-module").messaging;

module.exports = {
  startListener() {
    messaging.on("reboot-request", ()=>{
      module.exports.reboot();
    });
  },
  reboot() {
    let cmdWindows = [ "shutdown", "-r", "-c", "Rise Player needs to reboot computer." ];
    let cmdLinux = [ "bash", "-c", "dbus-send --system --print-reply --dest=org.freedesktop.login1 /org/freedesktop/login1 \"org.freedesktop.login1.Manager.Reboot\" boolean:true" ];
    let command = platform.isWindows() ? cmdWindows : cmdLinux;

    config.setGracefulShutdownFlag();

    childProcess.spawn(command[0], command.slice(1), {
      detached: true,
      stdio: "ignore"
    }).unref();
  }
};
