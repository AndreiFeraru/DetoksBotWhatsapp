/**
 * Type for a download function that returns a promise
 */
type DownloadFunction<T> = () => Promise<T>;

/**
 * Simple download queue to manage concurrent downloads
 */
export class DownloadQueue {
    private queue: Array<() => Promise<void>>;
    private active: number;
    private maxConcurrent: number;

    /**
     * Creates a new download queue
     * @param maxConcurrent Maximum concurrent downloads
     */
    constructor(maxConcurrent: number = 2) {
        this.queue = [];
        this.active = 0;
        this.maxConcurrent = maxConcurrent;
    }

    /**
     * Adds a download task to the queue
     * @param downloadFn Function that returns a Promise
     * @returns Promise resolving to the result of the download function
     */
    async add<T>(downloadFn: DownloadFunction<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const task = async (): Promise<void> => {
                this.active++;
                try {
                    const result = await downloadFn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.active--;
                    this.processNext();
                }
            };

            if (this.active < this.maxConcurrent) {
                task();
            } else {
                this.queue.push(task);
            }
        });
    }

    /**
     * Processes the next task in the queue
     */
    private processNext(): void {
        if (this.queue.length > 0 && this.active < this.maxConcurrent) {
            const nextTask = this.queue.shift();
            if (nextTask) {
                nextTask();
            }
        }
    }
}
