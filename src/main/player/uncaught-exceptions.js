const config = require("./config");
const platform = require("rise-common-electron").platform;

function sendToBQ() {
  const path = config.getUncaughtErrorFileName();

  if (platform.fileExists(path)) {
    return platform.readTextFile(path)
    .then(content => {
      log.error(`Uncaught exception: ${content}`, 'uncaught exception file found');

      return platform.renameFile(path, `${path}.bak`)
      .catch(error => log.error(error.error ? error.error.stack : error.stack, error.message || `could not rename ${path} to ${path}.bak`));
    })
    .catch(error => log.error(error.stack, 'error while retrieving previous uncaught exceptions'));
  }

  return Promise.resolve();
}

module.exports = {sendToBQ};
