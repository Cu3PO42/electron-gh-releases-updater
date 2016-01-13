var GitHubApi = require("github"),
    semver = require("semver"),
    request = require("request"),
    progress = require("request-progress"),
    fs = require("fs-extra"),
    AdmZip = require("adm-zip-electron"),
    tmp = require("tmp"),
    path = require("path"),
    os = require("os");

var gh = new GitHubApi({version: "3.0.0"});

function isReleaseAsset(asset) {
    var testRegEx = new RegExp("(update-any|" + os.platform() + "-" + os.arch() + ")\.zip");
    return asset.name.match(testRegEx);
}

function findUpdateAsset(release, fullRelease) {
    var assets = release.assets;
    if (release.assets === undefined) console.log(release);
    for (var i = 0; i < assets.length; ++i) {
        if (isReleaseAsset(assets[i])) {
            if (fullRelease === undefined || fullRelease === !assets[i].name.match(/update/))
                return assets[i];
        }
    }
    //console.log("has no update asset");
    return undefined;
}

function isUpdateRelease(release) {
    return !release.prerelease && findUpdateAsset(release) !== undefined;
}

function makeUpdater(releases, packageJson, progressCallback) {
    var fullUpdate = false;
    for (var i = 0; i < releases.length; ++i) {
        if (isUpdateRelease(releases[i]) && findUpdateAsset(releases[i], false) === undefined) {
            fullUpdate = true;
            break;
        }
    }
    var asset = findUpdateAsset(releases[0], fullUpdate);

    function update(callback) {
        tmp.dir(function(err, tmpPath) {
            progress(request({
                method: "GET",
                uri: asset.browser_download_url,
                gzip: true, encoding: null
            }, function(error, response, body) {
                new AdmZip(body).extractAllTo(tmpPath);
                if (!fullUpdate) {
                    try {
                        var asarPath = path.join(tmpPath, "app.asar");
                        fs.accessSync(asarPath, fs.F_OK);
                        fs.move(asarPath, process.resourcesPath, {clobber: true}, callback);
                    } catch(e) {
                        fs.move(tmpPath, path.join(process.resourcesPath, "app"), {clobber: true}, callback);
                    }
                } else {
                    var appPath;
                    if (process.platform === "darwin") {
                        appPath = path.join(process.resourcesPath, "../..");
                        fs.move(path.join(tmpPath, ""), appPath, {clobber: true}, callback);
                    } else {
                        appPath = path.join(process.resourcesPath, "..");
                        fs.move(tmpPath, appPath, {clobber: true}, callback);
                    }
                }
            })).on("progress", progressCallback);
        });
    }

    return {updateAvailable: true, changelog: getChangelog(releases), update: update};
}

function getChangelog(releases) {
    var changelog = [];

    for (var i = 0; i < releases.length; ++i) {
        var body = releases[i].body;
        if (body !== null && body !== undefined && body.length > 0) {
            changelog.push({tag: releases[i].tag_name, name: releases[i].name, body: body});
        }
    }

    return changelog;
}

module.exports = function(packageJson, callback, progressCallback) {
    if (packageJson.repository === undefined || packageJson.repository.type !== "git" || packageJson.repository.url === undefined) {
        callback("Passed package.json does not contain a valid git repository.");
        return;
    }
    var m = packageJson.repository.url.match(/^(?:https?:\/\/)?(?:www\.)?github.com\/([^\/]+)\/([^.]+).git$/);
    if (!m) {
        callback("Passed package.json's repository isn't on GitHub.");
        return;
    }
    var page = 0;
    var releases = [];
    function search() {
        gh.releases.listReleases({owner: m[1], repo: m[2], page: ++page, per_page: 10}, function(err, res) {
            if (err) {
                callback(err);
                return;
            }

            var i = 0;
            if (releases.length === 0) 
                for (; i < res.length && !isUpdateRelease(res[i]); ++i) { }

            for (; i < res.length && semver.gt(res[i].tag_name.substring(1), packageJson.version); ++i) {
                releases.push(res[i]);
            }

            if (i == res.length && res.length > 0) {
                search();
            } else {
                if (releases.length === 0) {
                    callback(null, {updateAvailable: false});
                    return;
                }

                callback(null, makeUpdater(releases, packageJson, progressCallback));
            }
        });
    }
    search();
};
