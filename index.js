var GitHubApi = require("github"),
    semver = require("semver"),
    request = require("request"),
    progress = require("request-progress"),
    fs = require("fs-extra"),
    AdmZip = require("adm-zip"),
    tmp = require("tmp");

var gh = new GitHubApi({version: "3.0.0"});

function isUpdateRelease(release) {
    if (release.prerelease)
        return false;
    var assets = release.assets;
    for (var i = 0; i < assets.length; ++i) {
        if (assets[i].name.match(/update-any\.zip$/))
            return true;
    }
    return false;

}

function makeUpdater(releases, packageJson, progressCallback) {
    var asset;
    for (var i = 0; i < releases[0].assets.length; ++i) {
        asset = releases[0].assets[i];
        if (asset.name.match(/update-any\.zip/)) break;
    }

    function update(directory, callback) {
        tmp.dir(function(err, path) {
            progress(request({
                method: "GET",
                uri: asset.browser_download_url,
                gzip: true, encoding: null
            }, function(error, response, body) {
                new AdmZip(body).extractAllTo(path);
                fs.move(path, directory, {clobber: true}, callback);
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
