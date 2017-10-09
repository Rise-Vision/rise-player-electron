mkdir -p src/main/viewer/localviewer && mkdir -p widgets
git clone git@github.com:Rise-Vision/private-keys.git
gcloud auth activate-service-account 452091732215@developer.gserviceaccount.com --key-file ./private-keys/storage-server/rva-media-library-ce0d2bd78b54.json
gsutil -m rsync -d -r gs://install-versions.risevision.com/localviewer src/main/viewer/localviewer
gsutil -m rsync -d -r gs://install-versions.risevision.com/widgets widgets
rm -rf src/main/viewer/localviewer/widgets
mv widgets src/main/viewer/localviewer
rm -rf node_modules
sudo npm install -g asar
npm install --production
cp -r node_modules src/main
rm -rf build
mkdir -p build
echo '{"useElectron": true}' >build/package.json
asar p src/main build/player.asar
makeself --notemp build player.sh "Rise Player"
mv player.sh build
cd build && 7z a -mx4 player.7z player.asar package.json
cat ../win-sfx/7zS.sfx ../win-sfx/sfx_config.txt player.7z >player.exe
rm player.7z
rm player.asar
cd ..
rm -rf src/main/node_modules
rm build/package.json
