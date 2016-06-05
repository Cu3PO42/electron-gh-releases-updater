import path from 'path';
import Promise from 'bluebird';
import plist from 'plist';
import * as fs from 'original-fs';
import { restart, doFullUpdate } from 'nix';

plist.build({ foo: 'bar' }); // call this so it requires all of its dependencies

const readFileAsync = Promise.promisify(fs.readFile);
const writeFileAsync = Promise.promisify(fs.writeFile);
const readdirAsync = Promise.promisify(fs.readdir);

export { unzip } from './nix';

export async function doFullUpdate(updatePath, currentVersion) {
  const appPath = path.join(process.resourcesPath, '..', '..');
  const newPath = path.join(updatePath, (await readdirAsync(updatePath))[0]);
  doFullUpdate(appPath, newPath, currentVersion);
}

export async function setVersionNumberAndRestart(updateVersion) {
  const plistPath = path.join(path.dirname(process.execPath), '..', 'Info.plist');
  const plistData = await readFileAsync(plistPath, 'utf-8');
  const infoPlist = plist.parse(plistData);
  infoPlist.CFBundleShortVersionString = infoPlist.CFBundleVersion = updateVersion;
  const patchedPlistData = plist.build(infoPlist);
  await writeFileAsync(plistPath, patchedPlistData, 'utf-8');
  restart();
}
