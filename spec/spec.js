describe("GitHub Releases Electron Updater", function() {
    var packageJson = {
        repository: {
            type: "git",
            url: "https://github.com/Cu3PO42/electron-gh-releases-updater.git"
        },
        version: "0.1.0"
    };

    var releaseData;
    var updateConfig;

    var proxyquire = require("proxyquire");
    var updater = proxyquire("../index.js", {
        github: (function() {
            function GitHub() {}

            GitHub.prototype.releases = {
                listReleases: function listReleases(params, callback) {
                    setImmediate(function() { callback(null, releaseData.slice(params.per_page * (params.page-1), params.per_page * params.page)) });
                }
            };

            GitHub.prototype.repos = {
                getContent: function(options, callback) {
                    setImmediate(function() {
                        if (updateConfig === undefined) {
                            callback("Error");
                        } else {
                            callback(null, JSON.stringify(updateConfig));
                        }
                    });
                }
            };

            GitHub["@noCallThru"] = true;

            return GitHub;
        })()
    }).default;

    it("should detect when there is no update available", function(done) {
        releaseData = [
            {
                tag_name: "v0.1.0",
                assets: []
            }
        ];

        updater(packageJson).then(function(res) {
            expect(res.updateAvailable).toBe(false);
            done();
        });
    });

    it("should find an immediate update", function(done) {
        releaseData = [
            {
                tag_name: "v0.1.1",
                assets: [
                    { name: "update-any.zip" }
                ]
            },
            {
                tag_name: "v0.1.0",
                assets: []
            }
        ];

        updater(packageJson).then(function(res) {
            expect(res.updateAvailable).toBe(true);
            done();
        });
    });

    it("should skip non-update releases", function(done) {
        releaseData = [
            {
                tag_name: "v0.2.1",
                assets: [
                    { name: "update-any.zip" }
                ]
            },
            {
                tag_name: "v0.1.1",
                assets: []
            },
            {
                tag_name: "v0.1.0",
                assets: []
            }
        ];

        updater(packageJson).then(function(res) {
            expect(res.updateAvailable).toBe(true);
            done();
        });
    });

    it("should search multiple pages for an update", function(done) {
        releaseData = [
            {
                tag_name: "v0.1.12",
                assets: []
            },
            {
                tag_name: "v0.1.11",
                assets: []
            },
            {
                tag_name: "v0.1.10",
                assets: []
            },
            {
                tag_name: "v0.1.9",
                assets: []
            },
            {
                tag_name: "v0.1.8",
                assets: []
            },
            {
                tag_name: "v0.1.7",
                assets: []
            },
            {
                tag_name: "v0.1.6",
                assets: []
            },
            {
                tag_name: "v0.1.5",
                assets: []
            },
            {
                tag_name: "v0.1.4",
                assets: []
            },
            {
                tag_name: "v0.1.3",
                assets: []
            },
            {
                tag_name: "v0.1.2",
                assets: []
            },
            {
                tag_name: "v0.1.1",
                assets: [
                    { name: "update-any.zip" }
                ]
            },
            {
                tag_name: "v0.1.0",
                assets: []
            }
        ];

        updater(packageJson).then(function(res) {
            expect(res.updateAvailable).toBe(true);
            done();
        });
    });

    it("should build a changelog", function(done) {
        releaseData = [
            {
                tag_name: "v0.1.3",
                assets: [
                    { name: "update-any.zip" }
                ],
                name: "0.1.3",
                body: "TEST1"
            },
            {
                tag_name: "v0.1.2",
                assets: [
                    { name: "update-any.zip" }
                ],
                name: "0.1.2",
                body: "TEST2"
            },
            {
                tag_name: "v0.1.1",
                assets: []
            },
            {
                tag_name: "v0.1.0",
                assets: []
            }
        ];

        updater(packageJson).then(function(res) {
            expect(res.updateAvailable).toBe(true);
            expect(res.changelog).toEqual([{tag: "v0.1.3", name: "0.1.3", body: "TEST1"},
                    {tag: "v0.1.2", name: "0.1.2", body: "TEST2"}]);
            done();
        });
    });

    it("should build a changelog over multiple release pages", function(done) {
        releaseData = [
            {
                tag_name: "v0.1.12",
                assets: [
                    { name: "update-any.zip" }
                ],
                name: "NAME",
                body: "TEST"
            },
            {
                tag_name: "v0.1.11",
                assets: []
            },
            {
                tag_name: "v0.1.10",
                assets: []
            },
            {
                tag_name: "v0.1.9",
                assets: []
            },
            {
                tag_name: "v0.1.8",
                assets: []
            },
            {
                tag_name: "v0.1.7",
                assets: []
            },
            {
                tag_name: "v0.1.6",
                assets: []
            },
            {
                tag_name: "v0.1.5",
                assets: []
            },
            {
                tag_name: "v0.1.4",
                assets: []
            },
            {
                tag_name: "v0.1.3",
                assets: []
            },
            {
                tag_name: "v0.1.2",
                assets: [],
                name: "NAME",
                body: "TEST"
            },
            {
                tag_name: "v0.1.1",
                assets: [
                    { name: "update-any.zip" }
                ]
            },
            {
                tag_name: "v0.1.0",
                assets: []
            }
        ];

        updater(packageJson).then(function(res) {
            expect(res.updateAvailable).toBe(true);
            expect(res.changelog).toEqual([{tag: "v0.1.12", name: "NAME", body: "TEST"}, {tag: "v0.1.2", name: "NAME", body: "TEST"}]);
            done();
        });

    });

    it("should respect an update config", function(done) {
        releaseData = [
            {
                tag_name: "v0.1.12",
                assets: [
                    { name: "update-any.zip" }
                ],
                name: "NAME",
                body: "TEST"
            },
            {
                tag_name: "v0.1.11",
                assets: [
                    { name: "update-any.zip" }
                ],
                name: "NAME",
                body: "TEST"
            }
        ];
        updateConfig = {
            "0.1.0": {
                version: "0.1.11"
            }
        };

        updater(packageJson).then(function(res) {
            expect(res.updateAvailable).toBe(true);
            expect(res.changelog).toEqual([{tag: "v0.1.11", name: "NAME", body: "TEST"}]);
            done();
        });
    });

    it("should not update when the desired verion is not available", function(done) {
        releaseData = [
            {
                tag_name: "v0.1.12",
                assets: [
                    { name: "update-any.zip" }
                ],
                name: "NAME",
                body: "TEST"
            }
        ];
        updateConfig = {
            "0.1.0": {
                version: "0.1.11"
            }
        };

        updater(packageJson).then(function(res) {
            expect(res.updateAvailable).toBe(false);
            done();
        });

    });
});
