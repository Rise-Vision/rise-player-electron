const apiEndpoint ="https://www.googleapis.com/storage/v1";
const commonConfig = require("common-display-module");
const localGCSDataFileName = ".gcs-local-data.json";
const network= require("rise-common-electron").network;
const {parse:urlParse} = require("url");
const path = require("path");
const platform = require("rise-common-electron").platform;
const urlParams = "alt=media&ifGenerationNotMatch=GENERATION";
const urlTemplate = `${apiEndpoint}/b/BUCKETNAME/o/FILEPATH?${urlParams}`;

const RETRY_INTERVAL_MILLIS = 1000;
const HOURLY_FETCH_LIMIT = 9;

let networkFailure;

function parseGCSPath(path) {
  if (!path || !path.includes("/")) {return [];}

  let splitPath = path.split("/");

  return [splitPath[0], encodeURIComponent(splitPath.slice(1).join("/"))];
}

function getlocalGCSData() {
  return new Promise((resolve)=>{
    log.external("gcs local contents load", localGCSDataFileName);

    if (commonConfig.fileExists(localGCSDataFileName)) {
      const filePath = path.join(commonConfig.getInstallDir(), localGCSDataFileName);
      platform.readTextFile(filePath)
      .then((data)=>{
        resolve(JSON.parse(data));
      })
      .catch((err)=>{
        log.external("error loading gcs local contents", require("util").inspect(err));
        resolve({});
      });
    } else {
      log.external("error loading gcs local contents", "File not found");
      resolve({});
    }
  });
}

function getGeneration(gcsPath, localGCSData){
  return localGCSData[gcsPath] ? localGCSData[gcsPath].generation : "-1";
}

function updateLocalGCSData(generation, gcsPath, dataPromise, localGCSData, useThrottle){
  log.debug("updating local gcs data " + gcsPath );

  let {lastFetch, lastFetchCount} = (localGCSData[gcsPath] || {});

  localGCSData[gcsPath] = {};
  localGCSData[gcsPath].generation = generation;
  localGCSData[gcsPath].lastFetchCount = calculateLastFetchCount(lastFetch, lastFetchCount);
  localGCSData[gcsPath].lastFetch = (new Date()).getTime();
  return dataPromise.then((content)=>{
    let filePath = path.join(commonConfig.getInstallDir(), localGCSDataFileName);

    localGCSData[gcsPath].content = content;
    log.external(`gcs contents update for ${gcsPath}`, content);

    return platform.writeTextFile(filePath, JSON.stringify(localGCSData, null, 2))
    .catch((err)=>{
      log.external(`error updating gcs contents for ${gcsPath}`, require("util").inspect(err));
    });
  });

  function calculateLastFetchCount(lastFetch, lastFetchCount) {
    if (lastFetch === undefined || lastFetchCount == undefined) {return 1;}
    if (!useThrottle) {return 1;}

    return fetchedInLast60Mins(lastFetch) ? lastFetchCount + 1 : 1;
  }
}

function fetchedInLast60Mins(lastFetch) {
  if (lastFetch === undefined) {return false;}

  return (new Date()).getTime() - lastFetch < 1000 * 60 * 60;
}

function shouldThrottle(gcsPath, localGCSData){
  if (!localGCSData[gcsPath]) {return false;}

  let {lastFetch, lastFetchCount} = localGCSData[gcsPath];
  if (lastFetch === undefined || lastFetchCount == undefined) {return false;}

  return fetchedInLast60Mins(lastFetch) && lastFetchCount >= HOURLY_FETCH_LIMIT;
}

function getLocalContent(gcsPath, localGCSData) {
  if (!localGCSData[gcsPath] || !localGCSData[gcsPath].content) {return Promise.resolve({});}
  return Promise.resolve(localGCSData[gcsPath].content);
}

function retryGetFileContents(gcsPath, options) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      module.exports.getFileContents(gcsPath, options)
      .then(resolve)
      .catch(reject);
    }, RETRY_INTERVAL_MILLIS);
  });
}

module.exports = {
  getFileContents(gcsPath, { retries = 2, useLocalData = true, useThrottle = true } = {}) {
    log.debug(`resolving contents for ${gcsPath}`);
    let [bucketName, filePath] = parseGCSPath(gcsPath);
    if (!filePath) {return Promise.reject("Invalid file path");}

    return getlocalGCSData()
    .then((localGCSData)=>{
      let url = urlTemplate.replace("BUCKETNAME", bucketName)
      .replace("FILEPATH", filePath)
      .replace("GENERATION", getGeneration(gcsPath, localGCSData));

      if (useThrottle && shouldThrottle(gcsPath, localGCSData)) {
        log.external("gcs check throttled", gcsPath);
        return getLocalContent(gcsPath, localGCSData);
      }

      return network.httpFetch(url)
      .then((resp)=>{
        if (resp.statusCode === 304) {return {local: useLocalData ? getLocalContent(gcsPath, localGCSData) : null};}
        if (resp.statusCode !== 200) {throw new Error(`${resp.status} ${resp.statusText}`);}
        return {remote: resp.json(), generation: resp.headers["x-goog-generation"]};
      })
      .then((data)=>{
        if (data.remote) {
          return updateLocalGCSData(data.generation, gcsPath, data.remote, localGCSData, useThrottle)
          .then(()=>{
            return data.remote;
          });
        } else {
          return data.local;
        }
      })
      .catch((err)=>{
        if (err && (err.message.startsWith("net::") || err.message.includes("ECONN"))) {networkFailure = true;}
        if (retries > 0) {
          return retryGetFileContents(gcsPath, { retries: retries - 1, useLocalData, useThrottle });
        }

        if (useLocalData) {
          log.debug(err);
          return getLocalContent(gcsPath, localGCSData);
        }

        throw err;
      });
    });
  },
  getCachedFileContents(gcsPath) {
    return getlocalGCSData().then(localGCSData=>getLocalContent(gcsPath, localGCSData));
  },
  getCachedFileContentsSync(gcsPath) {
    if (!commonConfig.fileExists(localGCSDataFileName)) {
      return null;
    }

    const filePath = path.join(commonConfig.getInstallDir(), localGCSDataFileName);
    const data = platform.readTextFileSync(filePath);

    const localGCSData = JSON.parse(data);

    if (!localGCSData[gcsPath] || !localGCSData[gcsPath].content) {
      return null;
    }

    return localGCSData[gcsPath].content;
  },
  localGCSDataFileName,
  hasNetworkFailure() {return networkFailure;},
  apiEndpointHost() {
    let url = urlParse(apiEndpoint);
    return `${url.protocol}//${url.host}`;
  }
};
