import Promise from 'bluebird';
import * as fs from 'original-fs';
import path from 'path';
import { app } from 'electron';
import { restart, doFullUpdate as doFullUpdateNix } from './nix';

const chmodAsync = Promise.promisify(fs.chmod);

export { unzip } from './nix';

export async function prepareRestart() {
}

function registerQuitHandler() {
  app.on('quit', () => {
    process.exit();
  });
}

export async function setVersionNumberAndRestart() {
  registerQuitHandler();
  restart();
}

export async function doFullUpdate(updatePath, currentVersion) {
  const appPath = path.join(process.resourcesPath, '..');
  const newPath = updatePath;

  const newExecPath = path.join(newPath, path.basename(process.execPath));
  await chmodAsync(newExecPath, '755');

  registerQuitHandler();
  doFullUpdateNix(appPath, newPath, currentVersion);
}
