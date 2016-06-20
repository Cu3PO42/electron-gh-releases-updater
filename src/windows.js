import * as fs from 'original-fs';
import * as fse from 'fs-extra';
import Promise from 'bluebird';
import path from 'path';
import { app } from 'electron';
import * as tmp from 'tmp';
import { spawn } from 'child_process';

const tmpNameAsync = Promise.promisify(tmp.tmpName);

const writeFileAsync = Promise.promisify(fs.writeFile);
const copyAsync = Promise.promisify(fse.copy);

export function unzip(zipFile, destination) {
  return new Promise((resolve) => {
    spawn('powershell.exe', [
      '[Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem"); ' +
      '[System.IO.Compression.ZipFile]::ExtractToDirectory(' +
        `"${zipFile}", ` +
        `"${destination}");`
    ], { stdio: 'ignore' }).on('close', resolve);
  });
}

export async function doFullUpdate(updatePath, currentVersion) {
  await writeFileAsync(path.join(updatePath, 'resources', 'UPDATED'), currentVersion, 'utf-8');
  const updateBatPath = await tmpNameAsync({ postfix: '.bat' });
  await copyAsync(path.join(__dirname, '..', 'update.bat'), updateBatPath);
  spawn('cmd.exe', [
    '/c start cmd.exe /c',
    updateBatPath,
    process.pid,
    updatePath,
    path.join(process.resourcesPath, '..'),
    process.execPath
  ], {
    detached: true,
    stdio: 'ignore',
    cwd: 'C:\\'
  }).unref();
  app.quit();
}

let setVersionBatPath, rceditExePath;
export async function prepareRestart() {
  setVersionBatPath = await tmpNameAsync({ postfix: '.bat' });
  rceditExePath = await tmpNameAsync({ postfix: '.exe' });

  await copyAsync(path.join(__dirname, '..', 'setversion.bat'), setVersionBatPath);
  await copyAsync(path.join(__dirname, '..', 'rcedit.exe'), rceditExePath);
}

export async function setVersionNumberAndRestart(updateVersion) {
  spawn('cmd.exe', [
    '/c start cmd.exe /c',
    setVersionBatPath,
    rceditExePath,
    process.execPath,
    updateVersion,
    process.pid
  ], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd()
  }).unref();
  app.quit();
}
