#!/bin/bash
MODULENAME="player-electron"
VERSION=$(cat version)
echo "deploying $VERSION"

git clone git@github.com:Rise-Vision/private-keys.git
gcloud auth activate-service-account 452091732215@developer.gserviceaccount.com --key-file ./private-keys/storage-server/rva-media-library-ce0d2bd78b54.json

mkdir -p manifests
gsutil -m cp gs://install-versions.risevision.com/display-modules-*.json manifests
find manifests -name "*.json" -exec node update-module-version.js '{}' $MODULENAME $VERSION 0 \;

gsutil -m cp manifests/*.json gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION
gsutil setmeta -h "Cache-Control:private, max-age=0" gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/*
gsutil setmeta -h "Content-Disposition:attachment" gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/*.sh
gsutil acl ch -u AllUsers:R gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/*
gsutil -m cp -p gs://install-versions.risevision.com/*.json gs://install-versions.risevision.com/backups/$MODULENAME/$VERSION
gsutil -m cp -p gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/* gs://install-versions.risevision.com/
gsutil -m cp -p gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/* gs://install-versions.risevision.com/releases/$MODULENAME/$VERSION

echo -n "$VERSION" > latest-version
gsutil cp latest-version gs://install-versions.risevision.com
gsutil setmeta -h "Cache-Control:private, max-age=0" gs://install-versions.risevision.com/latest-version
gsutil setmeta -h "Content-Type:text/plain" gs://install-versions.risevision.com/latest-version
gsutil acl ch -u AllUsers:R gs://install-versions.risevision.com/latest-version
