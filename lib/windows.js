'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setVersionNumberAndRestart = exports.doFullUpdate = undefined;

let doFullUpdate = exports.doFullUpdate = (() => {
  var ref = _asyncToGenerator(function* (updatePath, currentVersion) {
    yield writeFileAsync(_path2.default.join(updatePath, 'resources', 'UPDATED'), currentVersion, 'utf-8');
    const updateBatPath = yield tmpNameAsync({ postfix: '.bat' });
    yield copyAsync(_path2.default.join(__dirname, '..', 'update.bat'), updateBatPath);
    (0, _child_process.spawn)('cmd.exe', ['/c start cmd.exe /c', updateBatPath, process.pid, updatePath, _path2.default.join(process.resourcesPath, '..'), process.execPath], {
      detached: true,
      stdio: 'ignore',
      cwd: 'C:\\'
    }).unref();
    _electron.app.quit();
  });

  return function doFullUpdate(_x, _x2) {
    return ref.apply(this, arguments);
  };
})();

let setVersionNumberAndRestart = exports.setVersionNumberAndRestart = (() => {
  var ref = _asyncToGenerator(function* (updateVersion) {
    const setVersionBatPath = yield tmpNameAsync({ postfix: '.bat' });
    const rceditExePath = yield tmpNameAsync({ postfix: '.exe' });

    yield copyAsync(_path2.default.join(__dirname, '..', 'setversion.bat'), setVersionBatPath);
    yield copyAsync(_path2.default.join(__dirname, '..', 'rcedit.exe'), rceditExePath);

    (0, _child_process.spawn)('cmd.exe', ['/c start cmd.exe /c', setVersionBatPath, rceditExePath, process.execPath, updateVersion, process.pid], {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd()
    }).unref();
    _electron.app.quit();
  });

  return function setVersionNumberAndRestart(_x3) {
    return ref.apply(this, arguments);
  };
})();

exports.unzip = unzip;

var _originalFs = require('original-fs');

var fs = _interopRequireWildcard(_originalFs);

var _fsExtra = require('fs-extra');

var fse = _interopRequireWildcard(_fsExtra);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _electron = require('electron');

var _tmp = require('tmp');

var tmp = _interopRequireWildcard(_tmp);

var _child_process = require('child_process');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new _bluebird2.default(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return _bluebird2.default.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

const tmpNameAsync = _bluebird2.default.promisify(tmp.tmpName);

const writeFileAsync = _bluebird2.default.promisify(fs.writeFile);
const copyAsync = _bluebird2.default.promisify(fse.copy);

function unzip(zipFile, destination) {
  return new _bluebird2.default(resolve => {
    (0, _child_process.spawn)('powershell.exe', ['[Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem"); ' + '[System.IO.Compression.ZipFile]::ExtractToDirectory(' + zipFile + ', ' + destination + ');'], { stdio: 'ignore' }).on('close', resolve);
  });
}