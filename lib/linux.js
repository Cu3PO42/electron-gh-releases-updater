'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.doFullUpdate = exports.setVersionNumberAndRestart = exports.unzip = undefined;

let setVersionNumberAndRestart = exports.setVersionNumberAndRestart = (() => {
  var ref = _asyncToGenerator(function* () {
    (0, _nix.restart)();
  });

  return function setVersionNumberAndRestart() {
    return ref.apply(this, arguments);
  };
})();

let doFullUpdate = exports.doFullUpdate = (() => {
  var ref = _asyncToGenerator(function* (updatePath, currentVersion) {
    const appPath = _path2.default.join(process.resourcesPath, '..');
    const newPath = updatePath;

    const newExecPath = _path2.default.join(newPath, _path2.default.basename(process.execPath));
    yield chmodAsync(newExecPath, '755');

    (0, _nix.doFullUpdate)(appPath, newPath, currentVersion);
  });

  return function doFullUpdate(_x, _x2) {
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

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _fsOriginal = require('fs-original');

var fs = _interopRequireWildcard(_fsOriginal);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _bluebird2.default(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _bluebird2.default.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

const chmodAsync = _bluebird2.default.promisify(fs.chmod);