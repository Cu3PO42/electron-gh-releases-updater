# electron-gh-releases-updater

**Warning: This project is currently not actively maintained and there are some bugs. Depending on the required features, you may look somewhere else.**

electron-gh-releases-updeter lets you update your Electron based application through GitHub releases.
It can both download entirely new releases and only new app code without the Electron runtime.

## Requirements

You must use GitHub Releases to distribute your releases.
Pre-releases are not supported at this time.
The files must be compressed as `.zip`.
They must end in `${os.platform()}-${os.arch()}` for a complete update or `update-any` for updates containing only non-platform specific app code or `update-${os.platform()}-${os.arch()}` for app code including platform specific code.

The complete releases should include the application at the top level, the partial updates should include either the contents of the `app` folder or an `app.asar`.

**Partial updates will fail and leave a broken installation when the application is placed on a drive other than the drive the OS places temporary folders on, it is not recommended they are used at this time.**

On Linux `unzip` must be available (globally).

On Windows 7 PowerShell must be installed, on newer verions of Windows it is installed by default.

## Usage

Pass in your `package.json` to the search function. A simple usage example:

```js
import search from 'electron-gh-releases-updater';

const { updateAvailable, changelog, update } = search(require('../package.json'));

if (updateAvailable) {
    // Show changelog
    // changelog has type { tag: string, name: string, body: string }[]
    // and is a list of metadata from GitHub releases for all releases newer than the current one

    update();
}
```

The update function can be passed an optional callback that will be called with information about the progress of the download.
It has the type

```ts
(progressCallback: (
    progress: {
        percentage: number,
        speed: number,
        size: {total: number, transferred: number},
        time: {elapsed: number, remaining: number}
    }) => void
) => void
```