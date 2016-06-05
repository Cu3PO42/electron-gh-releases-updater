const releaseAssetRegEx = new RegExp("(update-any|" + os.platform() + "-" + os.arch() + ")\.zip");
function isReleaseAsset(asset) {
  return asset.name.match(releaseAssetRegEx);
}

export function findUpdateAsset({ assets }, fullRelease) {
  for (const asset of assets) {
    if (isReleaseAsset(asset) && (fullRelease === undefined || fullRelease === !asset.name.match(/update/))) {
      return asset;
    }
  }
  return undefined;
}

export function isUpdateRelease(release) {
  return !release.prerelease && findUpdateAsset(release) !== undefined;
}

// TODO make this configurable
export function getVersionFromRelease(release) {
  return release.tag_name.substring(1);
}

export function getChangelog(releases) {
  let changelog = [];

  for (const release of releases) {
    const { body } = release;
    if (body !== null && body !== undefined && body.length > 0) {
      changelog.push({
        tag: release.tag_name,
        name: release.name,
        body: body
      });
    }
  }

  return changelog;
}
