'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.doFullUpdate = undefined;

let doFullUpdate = exports.doFullUpdate = (() => {
  var ref = _asyncToGenerator(function* (appPath, newPath, currentVersion) {
    yield writeFileAsync((0, _path.join)(newPath, (0, _path.relative)(appPath, process.resourcesPath), 'UPDATED'), currentVersion, 'utf-8');
    (0, _child_process.spawn)('sh', ['-c', `while kill -0 "${ process.pid }"; do sleep 1; done; rm -rf "${ appPath }"; mv "${ newPath }" "${ appPath }"; "${ process.execPath }" &`], {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd()
    }).unref();
    _electron.app.quit();
  });

  return function doFullUpdate(_x, _x2, _x3) {
    return ref.apply(this, arguments);
  };
})();

exports.unzip = unzip;
exports.restart = restart;

var _fsExtra = require('fs-extra');

var fse = _interopRequireWildcard(_fsExtra);

var _child_process = require('child_process');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _electron = require('electron');

var _path = require('path');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _bluebird2.default(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _bluebird2.default.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

const moveAsync = _bluebird2.default.promisify(fse.move);
const writeFileAsync = _bluebird2.default.promisify(fse.writeFile);

function unzip(zipFile, destination) {
  return new _bluebird2.default(resolve => {
    (0, _child_process.spawn)('unzip', [zipFile, '-d', destination], { stdio: 'ignore' }).on('close', resolve);
  });
}

function restart() {
  (0, _child_process.spawn)('sh', ['-c', `while kill -0 "${ process.pid }"; do sleep 1; done; "${ process.execPath }" &`], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd()
  }).unref();
  _electron.app.quit();
}