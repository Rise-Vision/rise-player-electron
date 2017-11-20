const fs = require("fs");
const path = require("path");
const nodeExe = path.basename(process.execPath);
const scriptName = path.basename(__filename);
const filePath = process.argv[2];
const moduleName = process.argv[3];
const version = process.argv[4];
const pct = process.argv[5] ? Number(process.argv[5]) : null;

if (!filePath || !filePath.endsWith(".json")) {return err();}
if (!version || !version.startsWith("2")) {return err();}
if (!moduleName) {return err();}

try {
  let json = JSON.parse(fs.readFileSync(filePath));
  json.modules = json.modules.map(module=>module.name === moduleName ? Object.assign({}, module, {version}) : module);
  json.rolloutPct = (pct || pct === 0) ? pct : json.rolloutPct;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
} catch(e) {
  return err(e);
}

function err(e) {
  console.error(`usage: ${nodeExe} ${scriptName} [path-to${path.sep}manifest-file.json] [moduleName] [version] [pct]`);
  if (e) console.error(e);
}
