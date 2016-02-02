var GitHubApi = require("github"),
    semver = require("semver"),
    request = require("request"),
    progress = require("request-progress"),
    fs = require("fs-extra"),
    AdmZip = require("adm-zip-electron"),
    spawn = require("child_process").spawn,
    exec = require("child_process").exec,
    app = require("electron").app,
    tmp = require("tmp"),
    path = require("path"),
    plist = require("plist"),
    os = require("os");

var gh = new GitHubApi({version: "3.0.0"});

var prevCwd = process.cwd();

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

function makeUpdater(releases, packageJson, updateVersion) {
    var targetIndex = 0;
    var fullUpdate = undefined;
    updateVersion = { version: "0.4.0"};
    if (updateVersion !== undefined) {
        fullUpdate = updateVersion.full;
        var upVer = updateVersion.version;
        for (var i = 0; i < releases.length && semver.gt(releases[i].tag_name.substring(1), upVer); ++i) {}
        if (i === releases.length || releases[i].tag_name.substring(1) !== upVer) {
            return {updateAvailable: false};
        }
        targetIndex = i;
    }

    if (fullUpdate === undefined) {
        fullUpdate = false;
        for (var i = targetIndex; i < releases.length; ++i) {
            if (isUpdateRelease(releases[i]) && findUpdateAsset(releases[i], false) === undefined) {
                fullUpdate = true;
                break;
            }
        }
    }

    fullUpdate = false;

    var asset = findUpdateAsset(releases[targetIndex], fullUpdate);

    if (process.platform === "win32") {
        var setVersionBat = tmp.tmpNameSync({postfix: ".bat"});
        fs.copySync(path.join(__dirname, "setversion.bat"), setVersionBat);
        var rceditExe = tmp.tmpNameSync({postfix: ".exe"});
        fs.copySync(path.join(__dirname, "rcedit.exe"), rceditExe);
    }

    function callback(err) {
        if (err) {
            console.log(err);
            return;
        }
        if (!fullUpdate) {
            if (process.platform === "darwin") {
                var plistPath = path.join(path.dirname(process.execPath), "..", "Info.plist");
                fs.readFile(plistPath, { encoding: "utf-8" }, function(err, plistData) {
                    var infoPlist = plist.parse(plistData);
                    infoPlist.CFBundleShortVersionString = infoPlist.CFBundleVersion = updateVersion.version;
                    fs.writeFile(plistPath, plist.build(infoPlist), { encoding: "utf-8" }, function() {
                        exec(process.execPath, {cwd: prevCwd});
                        app.quit();
                    });
                });
                return;
            } else if (process.platform === "win32") {
                spawn("cmd.exe", [
                    "/c start cmd.exe /c",
                    setVersionBat,
                    rceditExe,
                    process.execPath,
                    updateVersion.version,
                    process.pid
                ], {
                    detached: true,
                    stdio: "ignore",
                    cwd: prevCwd
                }).unref();
                app.quit();
                return;
            }
        }
        exec(process.execPath, {cwd: prevCwd});
        app.quit();
    }

    function update(progressCallback) {
        tmp.dir(function(err, tmpPath) {
            progress(request({
                method: "GET",
                uri: asset.browser_download_url,
                gzip: true,
                encoding: null
            }, function(error, response, body) {
                //console.log("downloaded update");
                unzip(body, tmpPath, function() {
                    //console.log("unzipped");

                    if (!fullUpdate) {
                        //console.log("not doing a full update");
                        fs.writeFileSync(path.join(process.resourcesPath, "UPDATED"), packageJson.version, { encoding: "utf-8" });
                        try {
                            var asarPath = path.join(tmpPath, "app.asar");
                            fs.accessSync(asarPath, fs.F_OK);
                            fs.move(asarPath, process.resourcesPath, { clobber: true }, function(err) {
                                if (err) {
                                    callback(err);
                                    return;
                                }
                                fs.remove(path.join(process.resourcesPath, "app"), function() {
                                    callback(null);
                                });
                            });
                        } catch (e) {
                            //console.log("not an asar, moving folder " + tmpPath + " to " + path.join(process.resourcesPath, "app"));
                            fs.move(tmpPath, path.join(process.resourcesPath, "app"), { clobber: true }, function(err) {
                                if (err) {
                                    callback(err);
                                    return;
                                }
                                fs.remove(path.join(process.resourcesPath, "app.asar"), function() {
                                    callback(null);
                                });
                            });
                        }
                    } else {
                        if (process.platform === "win32") {
                            fs.writeFileSync(path.join(tmpPath, "resources", "UPDATED"), packageJson.version, {
                                encoding: "utf-8"
                            });
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
                        } else if (process.platform === "linux") {
                            try {
                                var newExecPath = path.join(tmpPath, path.basename(process.execPath));
                                fs.chmodSync(newExecPath, '755');
                            } catch (e) {}
                            appPath = path.join(process.resourcesPath, "..");
                            newPath = tmpPath;
                        }
                        //console.log("moving " + newPath + " to " + appPath);
                        fs.move(newPath, appPath, {clobber: true}, function(e) {
                            if (e) {
                                callback(e);
                                return;
                            }
                            fs.writeFileSync(path.join(process.resourcesPath, "UPDATED"), packageJson.version, {encoding: "utf-8"});
                            callback(null);
                        });

                    }
                });
            }), {throttle: 50}).on("progress", progressCallback);
        });
    }

    return {
        updateAvailable: true,
        changelog: getChangelog(releases, targetIndex),
        update: update
    };
}

function getChangelog(releases, targetIndex) {
    var changelog = [];

    for (var i = targetIndex; i < releases.length; ++i) {
        var body = releases[i].body;
        if (body !== null && body !== undefined && body.length > 0) {
            changelog.push({
                tag: releases[i].tag_name,
                name: releases[i].name,
                body: body
            });
        }
    }

    return changelog;
}

module.exports = {};
module.exports.default = function(packageJson) {
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
    return new Promise(function(resolve, reject) {
        function search() {
            gh.releases.listReleases({
                owner: m[1],
                repo: m[2],
                page: ++page,
                per_page: 10
            }, function(err, res) {
                if (err) {
                    reject(err);
                    return;
                }

                var i = 0;
                if (releases.length === 0)
                    for (; i < res.length && !isUpdateRelease(res[i]); ++i) {}

                for (; i < res.length && semver.gt(res[i].tag_name.substring(1), packageJson.version); ++i) {
                    releases.push(res[i]);
                }

                if (i == res.length && res.length > 0) {
                    search();
                } else {
                    if (releases.length === 0) {
                        resolve({updateAvailable: false});
                        return;
                    }

                    gh.repos.getContent({
                        user: m[1],
                        repo: m[2],
                        path: "update-config.json",
                        headers: {
                            "accept": "application/vnd.github.V3.raw"
                        }
                    }, function(err, res) {
                        if (err) {
                            resolve(makeUpdater(releases, packageJson));
                        }
                        try {
                            var updates = JSON.parse(res);
                            if (updates[packageJson.version]) {
                                resolve(makeUpdater(releases, packageJson, updates[packageJson.version]));
                                return;
                            }
                        } catch (e) {}
                        resolve(makeUpdater(releases, packageJson));
                    });
                }
            });
        }
        search();
    });
};
