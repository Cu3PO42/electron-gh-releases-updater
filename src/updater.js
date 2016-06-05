import { findUpdateAsset, isUpdateRelease, getVersionFromRelease, getChangelog } from './util';
import * as platform from './platform';
import * as tmp from 'tmp';
import request from 'request';
import progress from 'request-progress';
import Promise from 'bluebird';
import * as fs from 'original-fs';
import * as fse from 'fs-extra';
import path from 'path';

const tmpDirAsync = Promise.promisify(tmp.dir);
const tmpNameAsync = Promise.promisify(tmp.tmpName);

const readdirAsync = Promise.promisify(fs.readdir);
const statAsync = Promise.promisify(fs.stat);
const unlinkAsync = Promise.promisify(fs.unlink);
const renameAsync = Promise.promisify(fs.rename);
const removeAsync = Promise.promisify(fse.remove);
const moveAsync = Promise.promisify(fse.move);
const writeFileAsync = Promise.promisify(fs.writeFile);

function isFullUpdate(releases, packageJson, updateVersion) {
  if (updateVersion !== undefined) {
    return updateVersion.full;
  }

  for (const release of releases) {
    // if there is one release in the upgrade path that doesn't have update files, it is assumed a full update is needed
    if (isUpdateRelease(release) && findUpdateAsset(release, false) === undefined) {
      return true;
    }
  }

  return false;
}

async function downloadAsset(asset, progressCallback) {
  const tmpFile = await tmpNameAsync();
  const tmpDir = await tmpDirAsync();

  await new Promise((resolve, reject) => {
    progress(request({
      method: 'GET',
      uri: asset.browser_download_url,
      gzip: true,
      encoding: null
    }), { throttle: 50 })
    .on('progress', progressCallback)
    .on('err', reject)
    .pipe(fs.createWriteStream(tmpFile))
    .on('end', resolve)
  });

  await platform.unzip(tmpFile, tmpDir);
  await unlinkAsync(tmpFile);

  return tmpDir;
}

function makeFullUpdater(asset) {
  return (progressCallback) => {
    const updatePath = await downloadAsset(asset);
    await platform.doFullUpdate(updatePath);
  };
}

async function updateIsAsar(updatePath) {
  const files = await readdirAsync(updatePath);
  if (files.length !== 1 || files[0] !== 'app.asar') {
    return false;
  }

  const asarPath = path.join(updatePath, 'app.asar');
  const stats = await statAsync(asarPath);
  return stats.isFile();
}

function exists(file) {
  return new Promise((resolve) => {
    fs.access(file, fs.F_OK, err => resolve(!err));
  });
}

function makeNoneFullUpdater(asset, updateVersion) {
  return (progressCallback) => {
    const updatePath = await downloadAsset(asset);

    // Move the update to its desitnation and remove old folders
    const currentAsar = path.join(process.resourcesPath, 'app.asar');
    const currentApp = path.join(process.resourcesPath, 'app');
    if (updateIsAsar(updatePath)) {
      const updateAsar = path.join(updatePath, 'app.asar');
      if (await exists(currentAsar)) {
        await unlinkAsync(currentAsar);
      } else {
        await removeAsync(currentApp);
      }
      await renameAsync(updateAsar, currentAsar);
    } else {
      await moveAsync(updatePath, currentApp, { clobber: true });
      if (await exists(currentAsar)) {
        await unlink(currentAsar);
      }
    }

    // Patch version numbers, etc
    await writeFileAsync(path.join(process.resourcesPath, "UPDATED"), packageJson.version, { encoding: "utf-8" });
    await platform.setVersionNumberAndRestart(updateVersion)
  };
}

export default function makeUpdater(releases, packageJson, updateVersion) {
  if (updateVersion !== undefined) {
    // skip all releases until the specifically requested one
    const targetIndex = releases.findIndex(release => getVersionFromRelease(release) === updateVersion.version);
    if (targetIndex === -1) {
      // the requested release either doesn't exist or does not contain the required assets to update
      return { updateAvailable: false };
    }
    releases.splice(0, targetIndex);
  }

  const fullUpdate =  isFullUpdate(releases, packageJson, updateVersion);
  const asset = findUpdateAsset(releases[0], fullUpdate);
  const upVer = getVersionFromRelease(releases[0]);

  return {
    updateAvailable: true,
    changelog: getChangelog(releases),
    update: fullUpdate ? makeFullUpdater(asset, upVer) : makeNoneFullUpdater(asset, upVer)
  };
}
