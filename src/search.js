import GitHubApi from 'github';
import semver from 'semver';
import Promise from 'bluebird';
import { isUpdateRelease, getVersionFromRelease } from './util';
import makeUpdater from './updater';

const gh = new GitHubApi({ version: '3.0.0' });
const getReleases = Promise.promisify(gh.repos.getReleases);
const getContent = Promise.promisify(gh.repos.getContent);

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
    const releasePage = await getReleases({
      owner: m[1],
      repo: m[2],
      per_page: 10,
      page
    });

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

    if (!releases.length) {
      return { updateAvailable: false };
    }

    try {
      const updateConfig = await getContent({
        user: m[1],
        repo: m[2],
        path: 'update-config.json',
        headers: {
          'accept': 'application/vnd.github.V3.raw'
        }
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
}
