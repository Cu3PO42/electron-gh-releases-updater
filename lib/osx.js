'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setVersionNumberAndRestart = exports.doFullUpdate = exports.unzip = undefined;

let doFullUpdate = exports.doFullUpdate = (() => {
  var ref = _asyncToGenerator(function* (updatePath, currentVersion) {
    const appPath = _path2.default.join(process.resourcesPath, '..', '..');
    const newPath = _path2.default.join(updatePath, (yield readdirAsync(updatePath))[0]);
    (0, _nix.doFullUpdate)(appPath, newPath, currentVersion);
  });

  return function doFullUpdate(_x, _x2) {
    return ref.apply(this, arguments);
  };
})();

let setVersionNumberAndRestart = exports.setVersionNumberAndRestart = (() => {
  var ref = _asyncToGenerator(function* (updateVersion) {
    const plistPath = _path2.default.join(_path2.default.dirname(process.execPath), '..', 'Info.plist');
    const plistData = yield readFileAsync(plistPath, 'utf-8');
    const infoPlist = _plist2.default.parse(plistData);
    infoPlist.CFBundleShortVersionString = infoPlist.CFBundleVersion = updateVersion;
    const patchedPlistData = _plist2.default.build(infoPlist);
    yield writeFileAsync(plistPath, patchedPlistData, 'utf-8');
    (0, _nix.restart)();
  });

  return function setVersionNumberAndRestart(_x3) {
    return ref.apply(this, arguments);
  };
})();

var _nix = require('./nix');

Object.defineProperty(exports, 'unzip', {
  enumerable: true,
  get: function () {
    return _nix.unzip;
  }
});

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _plist = require('plist');

var _plist2 = _interopRequireDefault(_plist);

var _originalFs = require('original-fs');

var fs = _interopRequireWildcard(_originalFs);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _bluebird2.default(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _bluebird2.default.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

_plist2.default.build({ foo: 'bar' }); // call this so it requires all of its dependencies

const readFileAsync = _bluebird2.default.promisify(fs.readFile);
const writeFileAsync = _bluebird2.default.promisify(fs.writeFile);
const readdirAsync = _bluebird2.default.promisify(fs.readdir);