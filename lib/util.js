"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findUpdateAsset = findUpdateAsset;
exports.isUpdateRelease = isUpdateRelease;
exports.getVersionFromRelease = getVersionFromRelease;
exports.getChangelog = getChangelog;

var _os = require("os");

var _os2 = _interopRequireDefault(_os);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const releaseAssetRegEx = new RegExp("(update-any|" + _os2.default.platform() + "-" + _os2.default.arch() + ")\.zip");
function isReleaseAsset(asset) {
  return asset.name.match(releaseAssetRegEx);
}

function findUpdateAsset({ assets }, fullRelease) {
  for (const asset of assets) {
    if (isReleaseAsset(asset) && (fullRelease === undefined || fullRelease === !asset.name.match(/update/))) {
      return asset;
    }
  }
  return undefined;
}

function isUpdateRelease(release) {
  return !release.prerelease && findUpdateAsset(release) !== undefined;
}

// TODO make this configurable
function getVersionFromRelease(release) {
  return release.tag_name.substring(1);
}

function getChangelog(releases) {
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