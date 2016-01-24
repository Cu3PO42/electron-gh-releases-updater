declare function check(packageJson: any): Promise<{
    updateAvailable: boolean,
    changelog?: {
        tag: string,
        name: string,
        body: string
    }[],
    update?: (progressCallback: (
        progress: {
            percentage: number,
            speed: number,
            size: {total: number, transferred: number},
            time: {elapsed: number, remaining: number}
        }) => void
    ) => void
}>;

export default check;
