import fs from "fs";
import config from "../config";

/**
 * Generates a valid filename from a title
 * @param title The title to convert to a filename
 * @returns The sanitized filename
 */
export function getFileNameFromTitle(title: string): string {
    return `${title.replace(/[\/\\:*?"<>|]/g, "_")}.mp4`;
}

/**
 * Gets the full file path from a title
 * @param title The title to create path from
 * @returns The full file path
 */
export function getFilePathFromTitle(title: string): string {
    try {
        const fileName = getFileNameFromTitle(title);
        return `${config.VIDEOS_PATH}/${fileName}`;
    } catch (error) {
        console.error(`Error creating file path: ${(error as Error).message}`);
        throw new Error("Failed to create file path");
    }
}

/**
 * Safely deletes a file after a specified delay with proper error handling
 * @param filePath Path to the file to delete
 * @param delayMs Delay in milliseconds before deleting
 * @param logPrefix Prefix for logging messages
 * @returns Promise resolving to true if file was deleted or doesn't exist, false on error
 */
export async function safeDeleteFileWithDelay(
    filePath: string,
    delayMs: number = 0,
    logPrefix: string = ""
): Promise<boolean> {
    if (!filePath) {
        console.error(`${logPrefix} Invalid file path provided`);
        return false;
    }
    return new Promise((resolve) => {
        setTimeout(async () => {
            try {
                const result: boolean = await new Promise((resolveDelete) => {
                    fs.access(filePath, fs.constants.F_OK, (accessErr) => {
                        // File doesn't exist
                        if (accessErr) {
                            resolveDelete(true);
                            return;
                        }

                        // File exists, try to delete it
                        fs.unlink(filePath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error(
                                    `${logPrefix} Error deleting file: ${unlinkErr.message}`
                                );
                                resolveDelete(false);
                            } else {
                                console.log(
                                    `${logPrefix} Successfully deleted: ${filePath}`
                                );
                                resolveDelete(true);
                            }
                        });
                    });
                });

                resolve(result);
            } catch (error) {
                console.error(
                    `${logPrefix} Unexpected error during file deletion: ${
                        (error as Error).message
                    }`
                );
                resolve(false);
            }
        }, delayMs);
    });
}

/**
 * Ensures required directories exist
 */
export function ensureDirectories(): void {
    try {
        if (!fs.existsSync(config.VIDEOS_PATH)) {
            fs.mkdirSync(config.VIDEOS_PATH, { recursive: true });
        }
        if (!fs.existsSync(config.AUTH_INFO_PATH)) {
            fs.mkdirSync(config.AUTH_INFO_PATH, { recursive: true });
        }
    } catch (error) {
        console.error(
            `Error creating directories: ${(error as Error).message}`
        );
        throw error;
    }
}
