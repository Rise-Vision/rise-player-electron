const config = require("./config");
const fs = require("fs-extra");
const platform = require("rise-common-electron").platform;

function sendToBQ() {
  return Promise.resolve()
  .then(() => {
    const path = config.getUncaughtErrorFileName();

    if (platform.fileExists(path)) {
      return platform.readTextFile(path)
      .then(content => {
        log.error('uncaught exception file found', `Uncaught exception: ${content}`);

        return new Promise(resolve => {
          fs.remove(path, error => {
            error && log.error(`could not delete ${path}`, error);

            resolve();
          });
        });
      });
    }
  })
  .catch(error => log.error('error while retrieving previous uncaught exceptions', error.stack));
}

module.exports = {sendToBQ};
