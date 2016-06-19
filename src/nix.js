import * as fse from 'fs-extra';
import { spawn } from 'child_process';
import Promise from 'bluebird';
import { app } from 'electron';
import { join, relative } from 'path';

const moveAsync = Promise.promisify(fse.move);
const writeFileAsync = Promise.promisify(fse.writeFile);

export function unzip(zipFile, destination) {
  return new Promise((resolve) => {
    spawn('unzip', [zipFile, '-d', destination], { stdio: 'ignore' }).on('close', resolve);
  });
}

export function restart() {
  spawn('sh', [
    '-c',
    `while kill -0 "${process.pid}"; do sleep 1; done; "${process.execPath}" &`
  ], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd()
  }).unref();
  app.quit();
}

export async function doFullUpdate(appPath, newPath, currentVersion) {
  await writeFileAsync(join(newPath, relative(appPath, process.resourcesPath), 'UPDATED'), currentVersion, 'utf-8');
  spawn('sh', [
    '-c',
    `while kill -0 "${process.pid}"; do sleep 1; done; rm -rf "${appPath}"; mv "${newPath}" "${appPath}"; "${process.execPath}" &`
  ], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd()
  }).unref();
  app.quit();
}
