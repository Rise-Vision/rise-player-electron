const config = require("./config");
const commonMessaging = require("common-display-module/messaging");

let handlers = [];
let eventHandlers = {};

module.exports = {
  init() {
    commonMessaging.receiveMessages(config.moduleName)
    .then(receiver=>{
      receiver.on("message", (message)=>{
        console.log("handling message ", message);
        if (!message) {return;}
        if (!message.topic && !message.msg) {return;}

        if (eventHandlers[message.topic]) {
          return eventHandlers[message.topic]();
        }

        log.external("message received", JSON.stringify(message));
        handlers.forEach((handler)=>{
          handler(message);
        });
      });
    });
  },
  onEvent(event, action) {
    eventHandlers[event] = action;
  },
  on(message, action) {
    handlers.push((data)=>{
      if (data.msg === message) {action(data);}
    });
  },
  write(message) {
    commonMessaging.sendToMessagingService(message);
  },
  injectMessage(data) {
    handlers.forEach((handler)=>{
      handler(data);
    });
  },
  injectEvent(event) {
    eventHandlers[event]();
  }
};
