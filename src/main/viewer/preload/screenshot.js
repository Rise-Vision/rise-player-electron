const {desktopCapturer, screen} = require("electron");
const screenSize = screen.getPrimaryDisplay().size;

window.receiveFromPlayer("viewer-screenshot-request", ()=>{
  desktopCapturer.getSources({
    types:["screen"],
    thumbnailSize: screenSize
  }, (err, sources)=>{
    window.postToPlayer({
      msg: "viewer-screenshot-result",
      err,
      thumbnail: sources[0].thumbnail.toDataURL()
    }, true);
  });
});
