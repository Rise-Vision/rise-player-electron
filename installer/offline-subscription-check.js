const {network} = require("rise-common-electron");
const onlineDetection = requireRoot("installer/online-detection.js");
const authHost = "store-dot-rvaserver2.appspot.com";
const commonConfig = require("common-display-module").config;
const productCode = "c4b368be86245bf9501baaa6e0b00df9719869fd";
const authorizationUrl = `https://${authHost}/v1/widget/auth?id=DID&pc=${productCode}&startTrial=false`;
const OFFLINE_SUBSCRIPTION_FILE = "../8f0bfd16129083c1ad67370c916be014";
const version = commonConfig.getModuleVersion("player-electron");


function remoteSubscriptionStatus() {
  const displayId = commonConfig.getDisplaySettingsSync().displayid;
  if (!displayId) {return false;}

  return network.httpFetch(authorizationUrl.replace("DID", displayId))
  .then(resp=>resp.json())
  .then(saveStatus)
  .catch(e=>log.all(e) && false);
}

function localSubscriptionStatus() {
  return Promise.resolve(commonConfig.fileExists(OFFLINE_SUBSCRIPTION_FILE, version));
}

function saveStatus(status) {
  if(status.authorized){
    try {
      commonConfig.writeFile(OFFLINE_SUBSCRIPTION_FILE, "", version);
    } catch(e) {
      log.all(e);
    }
  } else {
    commonConfig.deleteFile(OFFLINE_SUBSCRIPTION_FILE, version, (error)=>{
      if(error)log.all(error);
    });
  }

  return status.authorized;
}

module.exports = {
  isSubscribed() {
    if (onlineDetection.isOnline()) {
      return remoteSubscriptionStatus();
    } else {
      return localSubscriptionStatus();
    }
  },
  fileFlag() {return OFFLINE_SUBSCRIPTION_FILE;}
};
