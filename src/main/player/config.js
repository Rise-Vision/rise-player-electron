const moduleCommon = require("common-display-module");
const {join: pathJoin, dirname} = require("path");
const cacheVersion = require(pathJoin(dirname(require.resolve("rise-cache-v2")), "package.json")).version;
const platform = require("rise-common-electron").platform;
let serialNumber;
let useRLSSingleFile = false;
let useRLSFolder = false;

const SERIAL_FILE = "/bookpc/serial-number";
const WIDGETS_SINGLEFILE_FILE = "b6f5f06a0e080803355f68fcaf65cf57";
const WIDGETS_FOLDER_FILE = "3ee8348d080fb43f58814c44801d28fe";

function getSerialFileName(app) {
  let name;

  try {
    name = pathJoin(app.getPath("appData"), SERIAL_FILE);
    return name;
  }
  catch (err) {
    log.debug(`getSerialFileName::catch ${err}`);
  }

  return "";
}

module.exports = {
  moduleName: "player-electron",
  cacheVersion,
  canUseRLSFolder() {
    return useRLSFolder;
  },
  canUseRLSSingleFile() {
    return useRLSSingleFile;
  },
  getUncaughtErrorFileName() {
    return pathJoin(moduleCommon.getInstallDir(), "uncaught-exception.json");
  },
  getSerialNumber() {
    return serialNumber || "";
  },
  noNetworkCountdownSeconds: 60,
  getPlayerGracefulShutdownPath() {
    return pathJoin(moduleCommon.getInstallDir(), "graceful_shutdown_flag");
  },
  setGracefulShutdownFlag() {
    moduleCommon.writeFile("graceful_shutdown_flag", "");
  },
  setRLSUsage() {
    const singleFilePath = pathJoin(moduleCommon.getInstallDir(), WIDGETS_SINGLEFILE_FILE);
    const folderPath = pathJoin(moduleCommon.getInstallDir(), WIDGETS_FOLDER_FILE);

    log.file(`single file path: ${singleFilePath}, folder path: ${folderPath}`);

    useRLSSingleFile = platform.fileExists(singleFilePath);
    useRLSFolder = platform.fileExists(folderPath);

    log.file(`single file: ${useRLSSingleFile}, folder: ${useRLSFolder}`, "set rls usage");
  },
  setSerialNumber(app) {
    if (!app) {
      return;
    }

    serialNumber = platform.readTextFileSync(getSerialFileName(app));
    log.debug(`set serial number: ${serialNumber}`);
  }
};
