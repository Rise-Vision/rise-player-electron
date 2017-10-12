set -x
rm -rf build-temp
cp -r src/main build-temp
mkdir -p build-temp/main/viewer/localviewer && mkdir -p build-temp/widgets
git clone git@github.com:Rise-Vision/private-keys.git
gcloud auth activate-service-account 452091732215@developer.gserviceaccount.com --key-file ./private-keys/storage-server/rva-media-library-ce0d2bd78b54.json
gsutil -m rsync -d -r gs://install-versions.risevision.com/localviewer build-temp/main/viewer/localviewer
gsutil -m rsync -d -r gs://install-versions.risevision.com/widgets build-temp/widgets
rm -rf build-temp/main/viewer/localviewer/widgets
mv build-temp/widgets build-temp/main/viewer/localviewer
rm -rf node_modules
sudo npm install -g asar
npm install --production
cp -r node_modules build-temp/main
rm -rf build
mkdir -p build
echo '{"useElectron": true}' >build/package.json
asar p build-temp/main build/player.asar
makeself --notemp build player.sh "Rise Player"
mv player.sh build
cd build && 7z a -mx4 player.7z player.asar package.json
cat ../win-sfx/7zS.sfx ../win-sfx/sfx_config.txt player.7z >player.exe
rm player.7z
rm player.asar
rm package.json
cd ..
rm -rf build-temp
