import Promise from 'bluebird';
import * as fs from 'fs-original';
import path from 'path';
import { restart, doFullUpdate as doFullUpdateNix } from './nix';

const chmodAsync = Promise.promisify(fs.chmod);

export { unzip } from './nix';

export async function prepareRestart() {
}

export async function setVersionNumberAndRestart() {
  restart();
}

export async function doFullUpdate(updatePath, currentVersion) {
  const appPath = path.join(process.resourcesPath, '..');
  const newPath = updatePath;

  const newExecPath = path.join(newPath, path.basename(process.execPath));
  await chmodAsync(newExecPath, '755');

  doFullUpdateNix(appPath, newPath, currentVersion);
}
