echo $(date +%Y.%m.%d.%H.%M) >version
echo "deploying $(cat /tmp/shared-workspace/version-string/version)"

# gsutil rm -r gs://install-versions.risevision.com/master/ || true
# gsutil -m cp -p gs://install-versions.risevision.com/staging/$(cat /tmp/shared-workspace/version-string/version)/* gs://
# install-versions.risevision.com/master
# gsutil cp gs://install-versions.risevision.com/electron*.json .
# for f in electron*.json; do sed -i "s/\"InstallerElectronVersion.*/\"InstallerElectronVersion\":\"$(cat /tmp/shared-work
# space/version-string/version)\",/" $f;done
# for f in electron*.json; do sed -i 's/"LatestRolloutPercent.*/"LatestRolloutPercent":2,/' $f;done
# gsutil cp electron*.json gs://install-versions.risevision.com/master/
# gsutil setmeta -h "Cache-Control:private, max-age=0" gs://install-versions.risevision.com/master/*.{sh,exe,json}
# gsutil setmeta -h "Content-Disposition:attachment" gs://install-versions.risevision.com/master/*.sh
# gsutil acl ch -u AllUsers:R gs://install-versions.risevision.com/master/*.{sh,exe,json}
# gsutil cp -p gs://install-versions.risevision.com/*.{exe,sh,json} gs://install-versions.risevision.com/backups/$(cat /tm
# p/shared-workspace/version-string/version)/
# gsutil -m cp -p gs://install-versions.risevision.com/master/* gs://install-versions.risevision.com/
# gsutil -m cp -p gs://install-versions.risevision.com/master/* gs://install-versions.risevision.com/releases/$(cat /tmp/s
# hared-workspace/version-string/version)/
# echo -n "RisePlayerElectron $(cat /tmp/shared-workspace/version-string/version)" > latest-version
# gsutil cp latest-version gs://install-versions.risevision.com
# gsutil setmeta -h "Cache-Control:private, max-age=0" gs://install-versions.risevision.com/latest-version
# gsutil setmeta -h "Content-Type:text/plain" gs://install-versions.risevision.com/latest-version
# gsutil acl ch -u AllUsers:R gs://install-versions.risevision.com/latest-version
