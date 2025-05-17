import { execFile } from "child_process";
import fs from "fs";
import { promisify } from "util";
import config from "../config";
import { getFileNameFromTitle } from "../utils/fileUtils";
import { validateTikTokUrl } from "../utils/urlUtils";

const execFilePromise = promisify(execFile);

/**
 * Sanitizes the title of the video to make it safe for use
 * @param videoInfo The video info object
 * @returns The sanitized title
 */
export function sanitizeTitle(title: string): string {
    if (!title) {
        throw new Error("Video info is empty or title is undefined");
    }
    return (
        title
            ?.replace(/\*/g, "\\*")
            ?.replace(/_/g, "\\_")
            ?.replace(/\[/g, "\\[")
            ?.replace(/\]/g, "\\]")
            ?.replace(/`/g, "\\`") || config.DEFAULT_VIDEO_TITLE
    );
}

/**
 * Generates a unique title name by appending timestamp and random ID
 * @param title The title to make unique
 * @returns The unique title
 */
export function appendUniqueSuffix(title: string): string {
    if (!title) {
        throw new Error("Title is empty or undefined");
    }
    const timestamp = new Date().getTime();
    const randomId = Math.floor(Math.random() * 1000);
    return title + `_${timestamp}_${randomId}`;
}

/**
 * Checks if yt-dlp is installed
 * @returns Promise resolving to true if installed, false otherwise
 */
export async function checkYtDlpInstalled(): Promise<boolean> {
    try {
        await execFilePromise("yt-dlp", ["--version"]);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Downloads TikTok video and returns info
 * @param url TikTok URL to download
 * @returns Promise resolving to video title
 * @throws Error If download or parsing fails
 */
export async function fetchVideo(url: string): Promise<string> {
    // Check if yt-dlp is installed
    const ytDlpInstalled = await checkYtDlpInstalled();
    if (!ytDlpInstalled) {
        throw new Error(
            "yt-dlp is not installed. Please install it to download TikTok videos."
        );
    }

    const ytDlp = "yt-dlp";
    validateTikTokUrl(url);

    try {
        // Step 1: Get metadata only with -j flag
        const metadataArgs: string[] = [
            "--print",
            "title",
            "--no-warnings",
            url,
        ];

        const { stdout, stderr } = await execFilePromise(ytDlp, metadataArgs);

        if (stderr && stderr.trim() !== "") {
            throw new Error(`Error getting TikTok metadata: ${stderr}`);
        }

        if (!stdout || stdout.trim() === "") {
            throw new Error("No output from yt-dlp");
        }

        // Parse the JSON to get video info
        const sanitizedTitle = sanitizeTitle(stdout);
        const uniqueTitle = appendUniqueSuffix(sanitizedTitle);
        const fileName = getFileNameFromTitle(uniqueTitle);
        const outputPath = `${config.VIDEOS_PATH}/${fileName}`;

        // Step 2: Actually download the video with the processed title
        const downloadArgs: string[] = [
            "-o",
            outputPath,
            "--no-progress", // Avoid excessive console output
            url,
        ];

        console.log(`Downloading TikTok video to: ${outputPath}`);
        await execFilePromise(ytDlp, downloadArgs);

        // Check if file was actually created
        if (!fs.existsSync(outputPath)) {
            throw new Error(
                `Download failed - output file not created at ${outputPath}`
            );
        }
        return uniqueTitle;
    } catch (error) {
        if ((error as Error).message.includes("JSON")) {
            throw new Error(
                `Error parsing video info: ${(error as Error).message}`
            );
        }
        throw new Error(
            `Error downloading TikTok video: ${(error as Error).message}`
        );
    }
}
