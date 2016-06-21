import semver from 'semver';
import Promise from 'bluebird';
import { isUpdateRelease, getVersionFromRelease } from './util';
import makeUpdater from './updater';
import request from 'request';

function queryGithub(endpoint, headers) {
  return new Promise((resolve, reject) => {
    request({
      baseUrl: 'https://api.github.com/',
      url: endpoint,
      headers: {
        'User-Agent': 'electron-gh-releases-updater',
        ...headers
      }
    }, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        reject(err);
        return;
      }
      if (res.headers['content-type'].startsWith('application/json')) {
        resolve(JSON.parse(body));
      } else {
        resolve(body);
      }
    });
  });
}

export default async function searchForUpdate(packageJson) {
  if (packageJson.repository === undefined || packageJson.repository.type !== "git" || packageJson.repository.url === undefined) {
    throw new Error("Passed package.json does not contain a valid git repository.");
  }
  var m = packageJson.repository.url.match(/^(?:https?:\/\/)?(?:www\.)?github.com\/([^\/]+)\/([^.]+).git$/);
  if (!m) {
    throw new Error("Passed package.json's repository isn't on GitHub.");
  }
  const releases = [];
  for (let page = 0;;++page) {
    const releasePage = await queryGithub(`/repos/${m[1]}/${m[2]}/releases?per_page=10&page=${page}`);

    let i = 0;
    if (!releases.length) {
      // Skip all releases that don't have the necessary assets for updating
      for (; i < releasePage.length && !isUpdateRelease(releasePage[i]); ++i) {}
    }

    // Copy all releases newer than the current one
    for (; i < releasePage.length && semver.gt(getVersionFromRelease(releasePage[i]), packageJson.version); ++i) {
      releases.push(releasePage[i]);
    }

    // We have either covered all releases or the next releases have a version lower than the current one
    if (i < releasePage.length || releasePage.length === 0) {
      break;
    }
  }

  if (!releases.length) {
    return { updateAvailable: false };
  }

  try {
    const updateConfig = await queryGithub(`/repos/${m[1]}/${m[2]}/contents/update-config.json`, {
      accept: 'application/vnd.github.v3.raw'
    });

    const updates = JSON.parse(updateConfig);
    if (updates[packageJson.version]) {
      return makeUpdater(releases, packageJson, updates[packageJson.version]);
    } else {
      return makeUpdater(releases, packageJson);
    }
  } catch(e) {
    return makeUpdater(releases, packageJson);
  }
}
