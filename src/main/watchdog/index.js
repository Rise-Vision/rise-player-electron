delete process.env.ELECTRON_RUN_AS_NODE;
delete process.env.LOAD_MODULE_IN_ELECTRON;

const path = require("path");
const moduleCommon = require("common-display-module");
const spawn = require("child_process").spawn;

function isWindows() {
  return process.platform === "win32";
}

let delay;
let scriptDir;
let componentTimers = {
  mainProcess: null,
  viewer: null
};

if (process.argv[2] === "--delay") {
  delay = Number(process.argv[3]);
} else {
  delay = 3 * 60 * 1000;
}

if (process.argv[4] === "--scriptDir") {
  scriptDir = process.argv[5];
} else {
  scriptDir = moduleCommon.getScriptDir();
}

function restartPlatform(component) {
  const commonArgs = [ "--unattended", "--skip-countdown", "--watchdog-restart=" + component ];
  const command = isWindows() ?
         "cmd.exe" :
          path.join(scriptDir, "start.sh");

  const args = isWindows() ? 
         ["/c", path.join(scriptDir, "background.jse"), "start.bat"].concat(commonArgs) :
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
