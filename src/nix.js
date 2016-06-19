import * as fse from 'fs-extra';
import { spawn } from 'child_process';
import Promise from 'bluebird';
import { app } from 'electron';

const moveAsync = Promise.promisify(fse.move);
const writeFileAsync = Promise.promisify(fse.writeFile);

export function unzip(zipFile, destination) {
  return new Promise((resolve) => {
    spawn('unzip', [zipFile, '-d', destination]).on('close', resolve);
  });
}

export function restart() {
  spawn('sh', [
    '-c',
    `while kill -0 "${process.pid}"; do sleep 1; done; "${process.execPath}" &`
  ], {
    detached: true,
    stdio: "ignore",
    cwd: process.cwd()
  }).unref();
  app.quit();
}

export async function doFullUpdate(appPath, newPath, currentVersion) {
  await moveAsync(newPath, appPath, { clobber: true });
  await writeFileAsync(path.join(process.resourcesPath, 'UPDATED'), currentVersion, 'utf-8');
  restart();
}
