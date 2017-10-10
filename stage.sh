#!/bin/bash
MODULENAME="player"
VERSION=$(date +%Y.%m.%d.%H.%M)
echo "staging $VERSION"
echo "$VERSION" >version

gsutil cp build/* gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/
gsutil setmeta -h "Cache-Control:private, max-age=0" gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/*
gsutil acl ch -u AllUsers:R gs://install-versions.risevision.com/staging/$MODULENAME/$VERSION/*
