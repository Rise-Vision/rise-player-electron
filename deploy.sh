#!/bin/bash
MODULENAME="player-electron"
VERSION=$(cat version)
echo "deploying $VERSION"

gsutil -m cp -p gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/* 
mkdir -p manifests
gsutil cp gs://install-versions.risevision.com/display-modules-*.json manifests

find manifests -name "*.json" -exec node update-module-version.js '{}' $MODULENAME $VERSION 0
gsutil cp manifests/*.json gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION
gsutil setmeta -h "Cache-Control:private, max-age=0" gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/*
gsutil setmeta -h "Content-Disposition:attachment" gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/*.sh
gsutil acl ch -u AllUsers:R gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/*
gsutil cp -p gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/* gs://install-versions.risevision.com/backups/$MODULENAME/$VERSION
gsutil -m cp -p gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/* gs://install-versions.risevision.com/
gsutil -m cp -p gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/* gs://install-versions.risevision.com/releases/$MODULENAME/$VERSION

echo -n "$VERSION" > latest-version
gsutil cp latest-version gs://install-versions.risevision.com
gsutil setmeta -h "Cache-Control:private, max-age=0" gs://install-versions.risevision.com/latest-version
gsutil setmeta -h "Content-Type:text/plain" gs://install-versions.risevision.com/latest-version
gsutil acl ch -u AllUsers:R gs://install-versions.risevision.com/latest-version
