import {
    default as makeWASocket,
    useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import { createConnectionHandler, handleNewMessage } from "./bot";
import config from "./config";
import { DownloadQueue } from "./services/downloadQueue";
import { ensureDirectories } from "./utils/fileUtils";

// Create a download queue instance
const downloadQueue = new DownloadQueue(config.MAX_CONCURRENT_DOWNLOADS);

/**
 * Starts the WhatsApp bot
 * @returns Promise that resolves when bot is started
 */
async function startBot(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(
        config.AUTH_INFO_PATH
    );
    const socket = makeWASocket({ auth: state });

    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("messages.upsert", handleNewMessage(socket, downloadQueue));
    socket.ev.on("connection.update", createConnectionHandler(startBot));

    console.log("Bot started successfully!");
}

/**
 * Initialize and start the bot
 */
async function init(): Promise<void> {
    try {
        // Ensure required directories exist
        ensureDirectories();

        console.log("Starting Detocks Bot...");
        console.log(
            "If this is your first time running the bot, you'll need to scan a QR code."
        );
        console.log("The QR code will appear below when ready.");
        console.log("---------------------------------------------");

        // Start the bot
        await startBot();

        console.log("---------------------------------------------");

        console.log(`Detocks Bot initialized`);
        console.log(`Videos directory: ${config.VIDEOS_PATH}`);
        console.log(`Auth info directory: ${config.AUTH_INFO_PATH}`);
        console.log(
            `Rate limit: ${config.RATE_LIMIT_MAX_REQUESTS} requests per ${
                config.RATE_LIMIT_WINDOW_MS / 1000
            } seconds`
        );
    } catch (error) {
        console.error("Failed to initialize bot:", error);
        process.exit(1);
    }
}

// Handle process termination gracefully
["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal as NodeJS.Signals, () => {
        console.log(`\nReceived ${signal}, cleaning up and exiting...`);
        process.exit(0);
    });
});

// Start the bot
init().catch((error) => {
    console.error("Fatal error during initialization:", error);
    process.exit(1);
});

// every 30 minutes, delete files older than 1 hour
setInterval(() => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Check if the directory exists
    if (fs.existsSync(config.VIDEOS_PATH)) {
        fs.readdir(config.VIDEOS_PATH, (err, files) => {
            if (err) {
                console.error("Error reading directory:", err);
                return;
            }

            files.forEach((file) => {
                const filePath = path.join(config.VIDEOS_PATH, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) {
                        console.error("Error getting file stats:", err);
                        return;
                    }

                    if (stats.mtimeMs < oneHourAgo) {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                console.error("Error deleting file:", err);
                            } else {
                                console.log(`Deleted old file: ${file}`);
                            }
                        });
                    }
                });
            });
        });
    }
}, 30 * 60 * 1000); // every 30 minutes
