declare function check(
    packageJson: any,
    callback: (
        err,
        res: {
            updateAvailable: boolean,
            changelog: {
                tag: string,
                name: string,
                body: string
            }[],
            update?: (callback: (err) => void) => void
        }) => void,
    progressCallback: (
        progress: {
            percentage: number,
            speed: number,
            size: {total: number, transferred: number},
            time: {elapsed: number, remaining: number}
        }) => void
    ): void;
    
export = check;
