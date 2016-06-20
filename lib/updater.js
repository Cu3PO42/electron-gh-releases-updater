'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

let downloadAsset = (() => {
  var ref = _asyncToGenerator(function* (asset, progressCallback) {
    const tmpFile = yield tmpNameAsync();
    const tmpDir = yield tmpDirAsync();

    yield new _bluebird2.default(function (resolve, reject) {
      (0, _requestProgress2.default)((0, _request2.default)({
        method: 'GET',
        uri: asset.browser_download_url,
        gzip: true,
        encoding: null
      }), { throttle: 50 }).on('progress', progressCallback).on('err', reject).pipe(fs.createWriteStream(tmpFile)).on('close', resolve);
    });

    yield platform.unzip(tmpFile, tmpDir);
    yield unlinkAsync(tmpFile);

    return tmpDir;
  });

  return function downloadAsset(_x, _x2) {
    return ref.apply(this, arguments);
  };
})();

let updateIsAsar = (() => {
  var ref = _asyncToGenerator(function* (updatePath) {
    const files = yield readdirAsync(updatePath);
    if (files.length !== 1 || files[0] !== 'app.asar') {
      return false;
    }

    const asarPath = _path2.default.join(updatePath, 'app.asar');
    const stats = yield statAsync(asarPath);
    return stats.isFile();
  });

  return function updateIsAsar(_x4) {
    return ref.apply(this, arguments);
  };
})();

exports.default = makeUpdater;

var _util = require('./util');

var _platform = require('./platform');

var platform = _interopRequireWildcard(_platform);

var _tmp = require('tmp');

var tmp = _interopRequireWildcard(_tmp);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _requestProgress = require('request-progress');

var _requestProgress2 = _interopRequireDefault(_requestProgress);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _originalFs = require('original-fs');

var fs = _interopRequireWildcard(_originalFs);

var _fsExtra = require('fs-extra');

var fse = _interopRequireWildcard(_fsExtra);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _bluebird2.default(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _bluebird2.default.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

const tmpDirAsync = _bluebird2.default.promisify(tmp.dir);
const tmpNameAsync = _bluebird2.default.promisify(tmp.tmpName);

const readdirAsync = _bluebird2.default.promisify(fs.readdir);
const statAsync = _bluebird2.default.promisify(fs.stat);
const unlinkAsync = _bluebird2.default.promisify(fs.unlink);
const renameAsync = _bluebird2.default.promisify(fs.rename);
const removeAsync = _bluebird2.default.promisify(fse.remove);
const moveAsync = _bluebird2.default.promisify(fse.move);
const writeFileAsync = _bluebird2.default.promisify(fs.writeFile);

function isFullUpdate(releases, packageJson, updateVersion) {
  if (updateVersion !== undefined) {
    return updateVersion.full;
  }

  for (const release of releases) {
    // if there is one release in the upgrade path that doesn't have update files, it is assumed a full update is needed
    if ((0, _util.isUpdateRelease)(release) && (0, _util.findUpdateAsset)(release, false) === undefined) {
      return true;
    }
  }

  return false;
}

function makeFullUpdater(asset, updateVersion, currentVersion) {
  return (() => {
    var ref = _asyncToGenerator(function* (progressCallback) {
      const updatePath = yield downloadAsset(asset, progressCallback);
      yield platform.doFullUpdate(updatePath, currentVersion);
    });

    return function (_x3) {
      return ref.apply(this, arguments);
    };
  })();
}

function exists(file) {
  return new _bluebird2.default(resolve => {
    fs.access(file, fs.F_OK, err => resolve(!err));
  });
}

function makeNoneFullUpdater(asset, updateVersion, currentVersion) {
  return (() => {
    var ref = _asyncToGenerator(function* (progressCallback) {
      const updatePath = yield downloadAsset(asset, progressCallback);

      // Move the update to its desitnation and remove old folders
      const currentAsar = _path2.default.join(process.resourcesPath, 'app.asar');
      const currentApp = _path2.default.join(process.resourcesPath, 'app');
      if (yield updateIsAsar(updatePath)) {
        const updateAsar = _path2.default.join(updatePath, 'app.asar');
        if (yield exists(currentAsar)) {
          yield unlinkAsync(currentAsar);
        } else {
          yield removeAsync(currentApp);
        }
        yield renameAsync(updateAsar, currentAsar);
      } else {
        yield moveAsync(updatePath, currentApp, { clobber: true });
        if (yield exists(currentAsar)) {
          yield unlinkAsync(currentAsar);
        }
      }

      // Patch version numbers, etc
      yield writeFileAsync(_path2.default.join(process.resourcesPath, "UPDATED"), currentVersion, { encoding: "utf-8" });
      yield platform.setVersionNumberAndRestart(updateVersion);
    });

    return function (_x5) {
      return ref.apply(this, arguments);
    };
  })();
}

function makeUpdater(releases, packageJson, updateVersion) {
  if (updateVersion !== undefined) {
    // skip all releases until the specifically requested one
    const targetIndex = releases.findIndex(release => (0, _util.getVersionFromRelease)(release) === updateVersion.version);
    if (targetIndex === -1) {
      // the requested release either doesn't exist or does not contain the required assets to update
      return { updateAvailable: false };
    }
    releases.splice(0, targetIndex);
  }

  const fullUpdate = isFullUpdate(releases, packageJson, updateVersion);
  const asset = (0, _util.findUpdateAsset)(releases[0], fullUpdate);
  const upVer = (0, _util.getVersionFromRelease)(releases[0]);

  return {
    updateAvailable: true,
    changelog: (0, _util.getChangelog)(releases),
    update: (fullUpdate ? makeFullUpdater : makeNoneFullUpdater)(asset, upVer, packageJson.version)
  };
}