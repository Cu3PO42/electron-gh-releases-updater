declare module "electron-gh-releases-updater" {
    function check(packageJson: any, callback: (err, res: {updateAvailable: boolean, update?: (directory: string, callback: (err) => void) => void}) => void): void;
    export = check;
}
