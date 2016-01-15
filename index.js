var GitHubApi = require("github"),
    semver = require("semver"),
    request = require("request"),
    progress = require("request-progress"),
    fs = require("fs-extra"),
    AdmZip = require("adm-zip-electron"),
    spawn = require("child_process").spawn,
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
    return undefined;
}

function isUpdateRelease(release) {
    return !release.prerelease && findUpdateAsset(release) !== undefined;
}

function unzip(data, tmpDirectory, callback) {
    //console.log("unzipping");
    if (process.platform === "darwin") {
        var tmpFile = tmp.fileSync({postfix: ".zip"});
        fs.write(tmpFile.fd, data, 0, data.length, function() {
            //console.log("written zip to file");
            var unzp = spawn("unzip", [tmpFile.name, "-d", tmpDirectory]);
            unzp.stdout.on("data", function(data) {});
            //unzp.stdout.on("data", function(data) { console.log("unzip stdout: " + data); });
            //unzp.stderr.on("data", function(data) { console.log("unzip stderr: " + data); });
            unzp.on("close", function() {
                tmpFile.removeCallback();
                callback();
            });
        });
    } else {
        new AdmZip(data).extractAllTo(tmpDirectory);
        callback();
    }
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

    function update() {
        tmp.dir(function(err, tmpPath) {
            progress(request({
                method: "GET",
                uri: asset.browser_download_url,
                gzip: true, encoding: null
            }, function(error, response, body) {
                //console.log("downloaded update");
                unzip(body, tmpPath, function() {
                   //console.log("unzipped");
                   if (!fullUpdate) {
                       //console.log("not doing a full update");
                        try {
                            var asarPath = path.join(tmpPath, "app.asar");
                            fs.accessSync(asarPath, fs.F_OK);
                            fs.move(asarPath, process.resourcesPath, {clobber: true}, callback);
                        } catch(e) {
                            //console.log("not an asar, moving folder " + tmpPath + " to " + path.join(process.resourcesPath, "app"));
                            fs.move(tmpPath, path.join(process.resourcesPath, "app"), {clobber: true}, callback);
                        }
                    } else {
                        if (process.platform === "win32") {
                            var app;
                            try {
                                app = require("electron").app;
                            } catch (e) {
                                app = require("app");
                            }
                            var updateBat = tmp.tmpNameSync({postfix: ".bat"});
                            //console.log("spawning update script: " + updateBat + " " + process.pid + " " + tmpPath + " " + path.join(process.resourcesPath, "..") + " " + process.execPath);
                            fs.copySync(path.join(__dirname, "update.bat"), updateBat);
                            spawn("cmd.exe", [
                                "/c start cmd.exe /c",
                                updateBat,
                                process.pid,
                                tmpPath,
                                path.join(process.resourcesPath, ".."),
                                process.execPath
                            ], {
                                detached: true,
                                stdio: "ignore",
                                cwd: "C:\\"
                            }).unref();
                            app.quit();
                            return;
                        }
                        //console.log("doing a full update");
                        var appPath;
                        var newPath;
                        if (process.platform === "darwin") {
                            appPath = path.join(process.resourcesPath, "../..");
                            newPath = path.join(tmpPath, fs.readdirSync(tmpPath)[0]);
                            //console.log("moving " + newPath + " to " + appPath);
                            fs.move(newPath, appPath, {clobber: true}, callback);
                        } else if (process.platform === "linux") {
                            try {
                                var newExecPath = path.join(tmpPath, path.basename(process.execPath));
                                fs.chmodSync(newExecPath, '755');
                            } catch(e) {}
                            appPath = path.join(process.resourcesPath, "..");
                            newPath = tmpPath;
                            fs.move(tmpPath, appPath, {clobber: true}, callback);
                        } else {

                        }
                    }
                });
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
