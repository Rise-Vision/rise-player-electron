const network = require("rise-common-electron").network;
const timeout = 3000;

const siteList = [
  "https://services.risevision.com/healthz",
  "https://viewer.risevision.com",
  "https://storage-dot-rvaserver2.appspot.com",
  "https://store.risevision.com",
  "https://aws.amazon.com/s3/",
  "https://storage.googleapis.com/install-versions.risevision.com/display-modules-manifest.json",
  "https://www.googleapis.com/storage/v1/b/install-versions.risevision.com/o/installer-win-64.exe?fields=kind"
];

module.exports = {
  reportConnectivity() {
    siteList.forEach(site=>{
      return network.httpFetch(site, {timeout})
      .then(res=>{
        log.external("downtime network check", `${res.statusCode} - ${site}`);
      }).catch((error)=>{
        log.external("downtime network error", `${error} - ${site}`);
      });
    });
  }
};
