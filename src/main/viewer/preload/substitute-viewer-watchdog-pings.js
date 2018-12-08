(function() {
  const ipc = require("electron").ipcRenderer;

  let intervalId;

  ipc.on("begin-substituting-viewer-pings-to-watchdog", ()=>{
    const withinThreeMinutesMillis = 165000;

    intervalId = setInterval(()=>{
      ipc.send("viewer-message", {
        message: "ping",
        from: "viewer"
      });
    }, withinThreeMinutesMillis);
  });

}());
