var GitHubApi = require("github"),
    semver = require("semver"),
    request = require("request"),
    fs = require("fs"),
    del = require("del"),
    tmp = require("tmp");

var gh = new GitHubApi({version: "3.0.0"});

function isUpdateRelease(release) {
    if (release.prerelease)
        return false;
    var assets = release.assets;
    for (var i = 0; i < assets.length; ++i) {
        if (assets[i].name.match(/update-any\.zip$/)
            return true;
    }
    return false;

}

function makeUpdater(asset, packageJson) {
    function update(directory, callback) {
        tmp.file(function(err, path, fd) {
            request.get(asset.url).pipe(fs.createWriteStream(null, {fd: fd}));
            .on("end", function() {
                del([directory+"**/*", directory+"**"], function(err) {
                    fs.createReadStream(null, {fd: fd}).pipe(unzip.Extract({path: directory}))
                    .on("end", function() {
                        callback(null);
                    });
                });
            });
        });
    }

    return {updateAvailable: true, update: update};
}

module.exports = function(packageJson, directory, callback) {
    if (packageJson.repository === undefined || packageJson.repository.type !== "git" || packageJson.repository.url === undefined) {
        callback("Passed package.json does not contain a valid git repository.");
        return;
    }
    var m = packageJson.repository.url.match(/^(?:https?:\/\/)?(?:www\.)?github.com\/([^\/]+)\/([^.]+).git$/);
    if (!m) {
        callback("Passed package.json's repository isn't on GitHub.");
        return;
    }
    gh.releases.listReleases({owner: m[1], repo: m[2]}, function(err, res) {
        if (err) {
            callback(err);
            return;
        }
        for (var i = 0; i < res.length && !isUpdateRelease(res[i]); ++i) { }
        if (i < res.length && isUpdateRelease(res[i]) && semver.gt(res[i].tag_name.substring(1), packageJson.version)) {
            for (var j = 0, assets = res[i].assets; j < assets.length; ++j)
                if (assets[j].name.match(/update-any\.zip$/)) {
                    callback(null, makeUpdater(assets[j], packageJson));
                }
            
        } else {
            callback(null, {updateAvailable: false});
        }
    });
};
