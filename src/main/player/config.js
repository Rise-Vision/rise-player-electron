const moduleCommon = require("common-display-module");
const {join: pathJoin, dirname} = require("path");
const cacheVersion = require(pathJoin(dirname(require.resolve("rise-cache-v2")), "package.json")).version;
const platform = require("rise-common-electron").platform;

const systemInfo = {
  serial: "",
  hostname: "",
  cpu: "",
  manufacturer: "",
  productname: ""
};

const BOOKPC_SERIAL_FILE = "/bookpc/serial-number";
const SYSTEM_DETAILS_FILE = "system-details.txt";

function getSerialFileName(app) {
  let name;

  try {
    name = pathJoin(app.getPath("appData"), BOOKPC_SERIAL_FILE);
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
  getUncaughtErrorFileName() {
    return pathJoin(moduleCommon.getInstallDir(), "uncaught-exception.json");
  },
  getSerialNumber() {
    return systemInfo.serial;
  },
  getHostname() {
    return systemInfo.hostname;
  },
  getManufacturer() {
    return systemInfo.manufacturer;
  },
  getProductName() {
    return systemInfo.productname;
  },
  getCpu() {
    return systemInfo.cpu;
  },
  noNetworkCountdownSeconds: 60,
  getPlayerGracefulShutdownPath() {
    return pathJoin(moduleCommon.getInstallDir(), "graceful_shutdown_flag");
  },
  setGracefulShutdownFlag() {
    moduleCommon.writeFile("graceful_shutdown_flag", "");
  },
  setBookPCSerialNumber(app) {
    if (!app) {
      return;
    }

    systemInfo.serial = platform.readTextFileSync(getSerialFileName(app));
    log.debug(`set serial number: ${systemInfo.serial}`);
  },
  setSystemInfo(app) {
    if (!app) {return;}

    Object.keys(systemInfo).forEach(key=>(systemInfo[key] = ""));

    module.exports.setBookPCSerialNumber(app);

    if (systemInfo.serial !== "") {return;}

    const detailsPath = pathJoin(platform.getHomeDir(), "rvplayer", SYSTEM_DETAILS_FILE);
    Object.assign(systemInfo, platform.parsePropertyList(platform.readTextFileSync(detailsPath)));
  }
};
