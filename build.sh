set -x
rm -rf build-temp
cp -r src/main build-temp
mkdir -p build-temp/viewer/localviewer && mkdir -p build-temp/widgets && mkdir -p build-temp/components
git clone git@github.com:Rise-Vision/private-keys.git
gcloud auth activate-service-account 452091732215@developer.gserviceaccount.com --key-file ./private-keys/storage-server/rva-media-library-ce0d2bd78b54.json
gsutil -m rsync -d -r gs://install-versions.risevision.com/localviewer build-temp/viewer/localviewer
gsutil -m rsync -d -r gs://install-versions.risevision.com/widgets build-temp/widgets
gsutil -m rsync -d -r gs://rise-content/stable/components build-temp/components
rm -rf build-temp/viewer/localviewer/widgets
rm -rf build-temp/viewer/localviewer/components
mv build-temp/widgets build-temp/viewer/localviewer
mv build-temp/components build-temp/viewer/localviewer
rm -rf node_modules
sudo npm install -g asar
npm install --production
cp -r node_modules build-temp
rm -rf build
mkdir -p build
echo '{"useElectron": true}' >build/package.json
asar p build-temp build/player-electron.asar
makeself --notemp build player-electron.sh "Rise Player"
mv player-electron.sh build
cd build && 7z a -mx4 player-electron.7z player-electron.asar package.json
cat ../win-sfx/7zS.sfx ../win-sfx/sfx_config.txt player-electron.7z >player-electron.exe
rm player-electron.7z
rm player-electron.asar
rm package.json
cd ..
rm -rf build-temp
