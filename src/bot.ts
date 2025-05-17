import {
    DisconnectReason,
    MessageUpsertType,
    WAMessage,
    WAMessageUpdate,
    WASocket,
    proto,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import config from "./config";
import { DownloadQueue } from "./services/downloadQueue";
import { fetchVideo } from "./services/videoHandler";
// import { WhatsAppMessage } from "./types";
import {
    getFileNameFromTitle,
    getFilePathFromTitle,
    safeDeleteFileWithDelay,
} from "./utils/fileUtils";
import { isRateLimited, recordRequest } from "./utils/rateLimit";
import { getUrlFromMessage } from "./utils/urlUtils";

type IWebMessageInfo = proto.IWebMessageInfo;

/**
 * Sends video to the user
 * @param title The video title
 * @param sock The WhatsApp socket
 * @param remoteJid The recipient's JID
 * @returns Promise resolving when complete
 */
export async function sendAndCleanupVideo(
    title: string,
    sock: WASocket,
    remoteJid: string
): Promise<void> {
    const fileName = getFileNameFromTitle(title);
    const filePath = getFilePathFromTitle(title);
    let listenerRemoved = false;
    let sentMsg: IWebMessageInfo | undefined = undefined;

    const unregisterListeners = () => {
        sock.ev.off("messages.update", handleMessageUpdate);
        sock.ev.off("messages.upsert", handleMessageUpsert);
        listenerRemoved = true;
    };

    const handleMessageUpdate = (messages: WAMessageUpdate[]) => {
        if (!sentMsg) return;

        // Check if this is our message being updated
        const ourMessage = messages.find(
            (m: WAMessageUpdate) =>
                sentMsg &&
                m.key.id === sentMsg.key.id &&
                m.key.remoteJid === remoteJid
        );

        // Status 3 is typically "delivered"
        if (ourMessage?.update.status === 3) {
            unregisterListeners();
            // Delete after a short delay once delivered
            safeDeleteFileWithDelay(
                filePath,
                config.DELIVERY_DELETE_DELAY_MS,
                "Deleting video after delivery:"
            );
        }
    };

    const handleMessageUpsert = ({
        messages,
        type,
        requestId,
    }: {
        messages: WAMessage[];
        type: MessageUpsertType;
        requestId?: string;
    }) => {
        if (!sentMsg) return;

        // Check if this is our message being updated
        const ourMessage = messages.find(
            (m: WAMessage) =>
                sentMsg &&
                m.key.id === sentMsg.key.id &&
                m.key.remoteJid === remoteJid
        );

        if (ourMessage) {
            unregisterListeners();
            // Delete after a short delay once delivered
            safeDeleteFileWithDelay(
                filePath,
                config.DELIVERY_DELETE_DELAY_MS,
                "Deleting video after delivery:"
            );
        }
    };

    try {
        /*
        Register the message update listener to handle delivery status
        This will be called when the message is delivered
        and will remove itself after the first delivery status is received
        It is used to delete the video after delivery
        */
        sock.ev.on("messages.update", handleMessageUpdate);
        sock.ev.on("messages.upsert", handleMessageUpsert);

        const allevents = [
            "connection.update",
            "creds.update",
            "messaging-history.set",
            "messages.upsert",
            "messages.update",
            "message-receipt.update",
            "presence.update",
            "contacts.update",
            "chats.update",
            "chats.upsert",
            "chats.delete",
            "groups.upsert",
        ];
        allevents.forEach((event) => {
            sock.ev.on(event as any, (data) => {
                console.log(`Event: ${event}`, data);
            });
        });

        // Send the message and get the message key
        sentMsg = await sock.sendMessage(remoteJid, {
            video: { url: filePath },
            caption: `⬇️ TikTok downloaded: ${title}`,
            mimetype: "video/mp4",
            fileName: fileName,
        });
    } catch (sendError) {
        console.error("Error sending video:", sendError);
        await sock.sendMessage(remoteJid, {
            text: "❌ Error sending the video.",
        });
    } finally {
        // // Clean up the listener if it hasn't been removed yet
        if (!listenerRemoved) {
            unregisterListeners();
        }
        // Failsafe delete after 30 seconds regardless of delivery status
        safeDeleteFileWithDelay(
            filePath,
            config.FAILSAFE_DELETE_DELAY_MS,
            "Failsafe delete after timeout:"
        );
    }
}

/**
 * Checks if the message should be ignored
 * @param msg The message object
 * @returns True if the message should be ignored, false otherwise
 */
function shouldIgnoreMessage(msg: WAMessage): boolean {
    // Ignore messages from the bot itself
    // TODO Uncomment
    // if (msg.key.fromMe) return true;

    // Ignore media or other types of messages
    const text =
        msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    if (!text) return true;

    // Ignore messages that are not tiktok links
    if (!text.includes("tiktok.com")) return true;

    return false;
}

/**
 * Creates a message handler for the given socket
 * @param sock The WhatsApp socket
 * @param downloadQueue Download queue instance
 * @returns Function to handle incoming messages
 */
export function handleNewMessage(
    sock: WASocket,
    downloadQueue: DownloadQueue
): (arg: {
    messages: IWebMessageInfo[];
    type: MessageUpsertType;
}) => Promise<void> {
    return async (arg: {
        messages: IWebMessageInfo[];
        type: MessageUpsertType;
    }) => {
        const { messages, type } = arg;
        if (type !== "notify") return;

        const msg = messages[0];
        if (!msg.message) return;

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid) return;

        try {
            if (shouldIgnoreMessage(msg as WAMessage)) return;

            if (isRateLimited(remoteJid)) {
                await sock.sendMessage(
                    remoteJid,
                    {
                        text: "⚠️ Rate limit exceeded. Please try again later.",
                        mentions: [remoteJid],
                    },
                    {
                        quoted: msg,
                    }
                );
                return;
            }

            const url = getUrlFromMessage(msg as WAMessage);

            await sock.sendMessage(
                remoteJid,
                {
                    text: `⬇️ Downloading TikTok ${url}`,
                    mentions: [remoteJid],
                },
                {
                    quoted: msg,
                }
            );

            // Record this request
            recordRequest(remoteJid);

            try {
                const title = await downloadQueue.add(() => fetchVideo(url));
                await sendAndCleanupVideo(title, sock, remoteJid);
            } catch (downloadError) {
                console.error(
                    `Error downloading video: ${
                        (downloadError as Error).message
                    }`
                );
                await sock.sendMessage(
                    remoteJid,
                    {
                        text: "❌ Error downloading TiktTok.",
                    },
                    {
                        quoted: msg,
                    }
                );
            }
        } catch (error) {
            console.error("Error processing message:", error);
            await sock.sendMessage(
                remoteJid,
                {
                    text: "❌ Error processing the message.",
                },
                {
                    quoted: msg,
                }
            );
        }
    };
}

/**
 * Handles connection update events
 * @param startBot Function to restart the bot
 * @returns Function to handle connection updates
 */
export function createConnectionHandler(startBot: () => Promise<void>) {
    // Tracking variables for connection attempts
    let attemptCount = 0;
    const maxAttempts = 5;

    return (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        // Add detailed connection logging
        console.log(`Connection update [${++attemptCount}]: ${connection}`, {
            hasQR: !!qr,
            statusCode: lastDisconnect?.error?.output?.statusCode,
            errorMessage: lastDisconnect?.error?.message,
            errorStack:
                lastDisconnect?.error?.stack?.split("\n")[0] || "No stack",
            errorName: lastDisconnect?.error?.name || "Unknown error",
        });

        // If we have an error object, log its full details
        if (lastDisconnect?.error) {
            console.log(
                "Full error details:",
                JSON.stringify(lastDisconnect.error, null, 2)
            );
        }

        // Handle QR code display
        if (qr) {
            console.log("Scan this QR code in WhatsApp to log in:");
            try {
                qrcode.generate(qr, { small: true });
                console.log("QR code generated successfully");
            } catch (qrError) {
                console.error("Failed to generate QR code:", qrError);
            }
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`Connection closed with status ${statusCode}`);

            if (
                statusCode !== DisconnectReason.loggedOut &&
                attemptCount < maxAttempts
            ) {
                console.log(
                    `Attempting reconnection ${attemptCount}/${maxAttempts}`
                );

                // Add escalating delay between reconnection attempts
                const delay = Math.min(1000 * Math.pow(2, attemptCount), 30000);
                console.log(
                    `Waiting ${delay / 1000} seconds before reconnecting...`
                );

                setTimeout(() => {
                    startBot().catch((err: any) => {
                        console.error("Error restarting bot:", err);
                    });
                }, delay);
            } else {
                console.log(
                    "Maximum reconnection attempts reached or logged out. Stopping."
                );
            }
        } else if (connection === "open") {
            console.log("Connection established successfully!");
            console.log(
                "The bot is now running. Send a TikTok link to start downloading videos."
            );
            // Reset attempt counter on successful connection
            attemptCount = 0;
        }
    };
}
