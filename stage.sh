#!/bin/bash
MODULENAME="player"
VERSION=$(date +%Y.%m.%d.%H.%M)
echo "staging $VERSION"
echo "$VERSION" >version

git clone git@github.com:Rise-Vision/private-keys.git
gcloud auth activate-service-account 452091732215@developer.gserviceaccount.com --key-file ./private-keys/storage-server/rva-media-library-ce0d2bd78b54.json
gsutil cp build/* gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/
gsutil setmeta -h "Cache-Control:private, max-age=0" gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/*
gsutil acl ch -u AllUsers:R gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/*
