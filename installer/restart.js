const childProcess = require("child_process");
const commonConfig = require("common-display-module").config;
const config = requireRoot("installer/config.js");
const messaging = require("common-display-module").messaging;
const platform = require("rise-common-electron").platform;
const path = require("path");
const version = commonConfig.getModuleVersion("player-electron");

function restartPlatform(extraParameters) {
  const commonArgs = [ "--unattended", "--skip-countdown" ];
  const command = platform.isWindows() ?
          "cmd.exe" :
          path.join(commonConfig.getScriptsDir(version), "start.sh");
  const args = platform.isWindows() ?
          ["/c", path.join(commonConfig.getScriptsDir(version), "background.jse"), "start.bat"].concat(commonArgs) :
          commonArgs;

  if(extraParameters) {
    extraParameters.forEach((param)=>{
      args.push(param);
    });
  }

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
