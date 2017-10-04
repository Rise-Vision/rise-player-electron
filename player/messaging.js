const Primus = require("primus");
const Socket = Primus.createSocket({transformer: "websockets"});
const config = require("./config.js");
const network = require("rise-common-electron").network;

let handlers = [];
let eventHandlers = {};
let connection;

module.exports = {
  init() {
    let settings = config.getDisplaySettingsSync(),
      displayId = settings.displayid,
      url = settings.messagingurl,
      serverUrl = (url || "https://display-messaging.risevision.com") + "?displayId=" + displayId + "&machineId="+config.getMachineId();

    module.exports.disconnect();

    log.debug("messaging connecting to " + serverUrl + " via " + JSON.stringify(network.getProxyAgents()));
    connection = new Socket(serverUrl, {
      transport: {
        agent: network.getProxyAgents().httpsAgent
      },
      reconnect: {
        max: 1800000,
        min: 5000,
        retries: Infinity
      }
    });

    connection.on("open", ()=>{
      log.external("messaging service connected");
      if(eventHandlers.connected) {
        eventHandlers.connected();
      }
    });

    connection.on("close", ()=>{
      log.external("messaging service connection closed");
      if(eventHandlers.disconnected) {
        eventHandlers.disconnected();
      }
    });

    connection.on("end", ()=>{
      log.external("messaging service disconnected");
      if(eventHandlers.disconnected) {
        eventHandlers.disconnected();
      }
    });

    connection.on("data", (data)=>{
      log.external("message received", JSON.stringify(data));
      handlers.forEach((handler)=>{
        handler(data);
      });
    });

    connection.on("error", (error)=>{
      log.external("messaging error", error.stack);
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
    return connection.write(message);
  },
  disconnect() {
    if (connection) {connection.end();}
  },
  injectMessage(data) {
    handlers.forEach((handler)=>{
      handler(data);
    });
  }
};
