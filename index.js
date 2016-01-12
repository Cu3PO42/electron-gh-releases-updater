var GitHubApi = require("github"),
    semver = require("semver"),
    request = require("request"),
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

function makeUpdater(asset, changelog, packageJson) {
    function update(directory, callback) {
        tmp.dir(function(err, path) {
            request({
                method: "GET",
                uri: asset.browser_download_url,
                gzip: true, encoding: null
            }, function(error, response, body) {
                new AdmZip(body).extractAllTo(path);
                fs.move(path, directory, {clobber: true}, callback);
            });
        });
    }

    return {updateAvailable: true, changelog: changelog, update: update};
}

function getChangelog(owner, repo, id, page, packageJson, callback) {
    var changelog = [];
    function search() {
        gh.releases.listReleases({owner: owner, repo: repo, page: page++, per_page: 10}, function(err, res) {
            if (err) {
                callback(err);
                return;
            }
            var i = 0;
            while (res[i].id != id) ++i;
            for (; i < res.length && semver.gt(res[i].tag_name.substring(1), packageJson.version); ++i) {
                var body = res[i].body;
                if (body !== null && body !== undefined && body.length > 0) {
                    changelog.push({tag: res[i].tag_name, name: res[i].name, body: body});
                }
            }
            if (semver.gt(res[Math.min(res.length-1, i)].tag_name.substring(1),packageJson.version)) {
                search();
            } else {
                callback(null, changelog);
            }
        });
    }
    search();
}

module.exports = function(packageJson, callback) {
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
    function search() {
        gh.releases.listReleases({owner: m[1], repo: m[2], page: ++page, per_page: 10}, function(err, res) {
            if (err) {
                callback(err);
                return;
            }
            for (var i = 0; i < res.length && !isUpdateRelease(res[i]); ++i) { }
            if (i < res.length) {
                if (isUpdateRelease(res[i]) && semver.gt(res[i].tag_name.substring(1), packageJson.version)) {
                    for (var j = 0, assets = res[i].assets; j < assets.length; ++j)
                        if (assets[j].name.match(/update-any\.zip$/)) {
                            (function(asset) {
                                getChangelog(m[1], m[2], res[i].id, page, packageJson, function(err, changelog) {
                                    callback(null, makeUpdater(asset, changelog, packageJson));
                                });
                            })(assets[j]);
                        }
                }
            } else if (semver.gt(res[i-1].tag_name.substring(1), packageJson.version) && i == 10) {
                search();
            } else {
                callback(null, {updateAvailable: false});
            }
        });
    }
    search();
};
