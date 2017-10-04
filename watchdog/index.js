delete process.env.ELECTRON_RUN_AS_NODE;

const path = require("path");
const spawn = require("child_process").spawn;
const version = require("../version.json");
let delay;
let componentTimers = {
  mainProcess: null,
  viewer: null
};

if (process.argv[2] === "--delay") {
  delay = process.argv[3];
} else {
  delay = 3 * 60 * 1000;
}

function isWindows() {
  return process.platform === "win32";
}

function getHomeDir() {
  return process.env[isWindows() ? "LOCALAPPDATA" : "HOME"];
}

function getInstallDir(version) {
  return path.join(getHomeDir(), "rvplayer", version || "");
}

function restartPlatform(component) {
  const installDir = getInstallDir(version);
  const commonArgs = [ "--unattended", "--skip-countdown", "--watchdog-restart=" + component ];
  const command = isWindows() ?
         "cmd.exe" :
          path.join(installDir, "Installer", "scripts", "start.sh");

  const args = isWindows() ? 
         ["/c", path.join(installDir, "Installer", "scripts", "background.jse"), "start.bat"].concat(commonArgs) :
          commonArgs;

  spawn(command, args, {
    detached: true,
    stdio: "ignore"
  }).unref();
  process.exit(0);
}

function resetTimer(componentName) {
  clearTimeout(componentTimers[componentName]);
  componentTimers[componentName] = setTimeout(()=>{
    restartPlatform(componentName);
  }, delay);
}

for (let component in componentTimers) {
  resetTimer(component);
}

process.on("message", (contents)=>{
  if (contents.message === "ping"){
    resetTimer(contents.from);
    process.send({
      message: "pong",
      from: "watchdog",
      to: contents.from
    });
  }
});
