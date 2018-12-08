(function() {
  const ipc = require("electron").ipcRenderer;

  ipc.on("begin-substituting-viewer-pings-to-watchdog", ()=>{
    sendSubstitutePings();
  });

  function sendSubstitutePings() {
    const withinThreeMinutesMillis = 165000;

    ipc.send("viewer-message", {
      message: "ping",
      from: "viewer"
    });

    setTimeout(sendSubstitutePings, withinThreeMinutesMillis);
  }
}());
