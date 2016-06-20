'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _github = require('github');

var _github2 = _interopRequireDefault(_github);

var _semver = require('semver');

var _semver2 = _interopRequireDefault(_semver);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _util = require('./util');

var _updater = require('./updater');

var _updater2 = _interopRequireDefault(_updater);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _bluebird2.default(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _bluebird2.default.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

const gh = new _github2.default({ version: '3.0.0' });
const getReleases = _bluebird2.default.promisify(gh.repos.getReleases.bind(gh.repos));
const getContent = _bluebird2.default.promisify(gh.repos.getContent.bind(gh.repos));

exports.default = (() => {
  var ref = _asyncToGenerator(function* (packageJson) {
    if (packageJson.repository === undefined || packageJson.repository.type !== "git" || packageJson.repository.url === undefined) {
      throw new Error("Passed package.json does not contain a valid git repository.");
    }
    var m = packageJson.repository.url.match(/^(?:https?:\/\/)?(?:www\.)?github.com\/([^\/]+)\/([^.]+).git$/);
    if (!m) {
      throw new Error("Passed package.json's repository isn't on GitHub.");
    }
    const releases = [];
    for (let page = 0;; ++page) {
      const releasePage = yield getReleases({
        user: m[1],
        repo: m[2],
        per_page: 10,
        page
      });

      let i = 0;
      if (!releases.length) {
        // Skip all releases that don't have the necessary assets for updating
        for (; i < releasePage.length && !(0, _util.isUpdateRelease)(releasePage[i]); ++i) {}
      }

      // Copy all releases newer than the current one
      for (; i < releasePage.length && _semver2.default.gt((0, _util.getVersionFromRelease)(releasePage[i]), packageJson.version); ++i) {
        releases.push(releasePage[i]);
      }

      // We have either covered all releases or the next releases have a version lower than the current one
      if (i < releasePage.length || releasePage.length === 0) {
        break;
      }
    }

    if (!releases.length) {
      return { updateAvailable: false };
    }

    try {
      const updateConfig = yield getContent({
        user: m[1],
        repo: m[2],
        path: 'update-config.json',
        headers: {
          'accept': 'application/vnd.github.V3.raw'
        }
      });

      const updates = JSON.parse(updateConfig);
      if (updates[packageJson.version]) {
        return (0, _updater2.default)(releases, packageJson, updates[packageJson.version]);
      } else {
        return (0, _updater2.default)(releases, packageJson);
      }
    } catch (e) {
      return (0, _updater2.default)(releases, packageJson);
    }
  });

  function searchForUpdate(_x) {
    return ref.apply(this, arguments);
  }

  return searchForUpdate;
})();