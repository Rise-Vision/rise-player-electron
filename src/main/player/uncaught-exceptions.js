const config = require("./config");
const platform = require("rise-common-electron").platform;

function sendToBQ() {
  const path = config.getUncaughtErrorFileName();

  if (platform.fileExists(path)) {
    return platform.readTextFile(path)
    .then(content => {
      log.error('uncaught exception file found', `Uncaught exception: ${content}`);

      return platform.renameFile(path, `${path}.bak`)
      .catch(error => log.error(error.message || `could not rename ${path} to ${path}.bak`, error.error ? error.error.stack : error.stack));
    })
    .catch(error => log.error('error while retrieving previous uncaught exceptions', error.stack));
  }

  return Promise.resolve();
}

module.exports = {sendToBQ};
