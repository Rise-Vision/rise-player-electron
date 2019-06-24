const messaging = require('../player/messaging');

let templateDoneReceived = false;

messaging.onEvent('template-done', () => {
  log.file(null, 'template-done received');
  templateDoneReceived = true;
});

module.exports = {
  isDone() {
    return templateDoneReceived;
  },
  reset() {
    templateDoneReceived = false;
  }
};
