const childProcess = require("child_process");
const config = require("../player/config.js");
const commonConfig = require("common-display-module");
const messaging = require("./messaging.js");
const platform = require("rise-common-electron").platform;
const path = require("path");

function restartPlatform(extraParameters) {
  const commonArgs = [ "--unattended", "--skip-countdown" ];
  const command = platform.isWindows() ?
          "cmd.exe" :
          path.join(commonConfig.getScriptDir(), "start.sh");
  const args = platform.isWindows() ?
          ["/c", path.join(commonConfig.getScriptDir(), "background.jse"), "start.bat"].concat(commonArgs) :
          commonArgs;

  if(extraParameters) {
    extraParameters.forEach((param)=>{
      args.push(param);
    });
  }

  log.all('restarting', `${command} ${args.join(' ')}`);

  config.setGracefulShutdownFlag();

  childProcess.spawn(command, args, {
    detached: true,
    stdio: "ignore"
  }).unref();
}

module.exports = {
  startListener() {
    messaging.on("restart-request", ()=>{
      module.exports.restart();
    });
  },
  startCountdown() {
    setTimeout(module.exports.restart, config.noNetworkCountdownSeconds * 1000);
  },
  restart(extraParameters) {
    restartPlatform(extraParameters);
  }
};
