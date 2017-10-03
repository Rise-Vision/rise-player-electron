const commonConfig = require("common-display-module").config;
const {join: pathJoin, dirname} = require("path");
const cacheVersion = require(pathJoin(dirname(require.resolve("rise-cache-v2")), "package.json")).version;
const platform = require("rise-common-electron").platform;
let serialNumber;

const SERIAL_FILE = "/bookpc/serial-number";

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
  cacheVersion,
  getSerialNumber() {
    return serialNumber || "";
  },
  noNetworkCountdownSeconds: 60,
  setGracefulShutdownFlag() {
    commonConfig.writeFile("graceful_shutdown_flag", "");
  },
  setSerialNumber(app) {
    if (!app) {
      return;
    }

    serialNumber = platform.readTextFileSync(getSerialFileName(app));
    log.debug(`set serial number: ${serialNumber}`);
  }
};
