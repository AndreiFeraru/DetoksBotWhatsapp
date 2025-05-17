import { WAMessage } from "@whiskeysockets/baileys";
import config from "../config";

/**
 * Extracts the URL from the message
 * @param msg The message object
 * @returns The extracted URL
 * @throws Error If the URL is invalid
 */
export function getUrlFromMessage(msg: WAMessage): string {
    const text =
        msg.message?.conversation || msg.message?.extendedTextMessage?.text;

    if (typeof text !== "string" || !text) {
        throw new Error("Message text is empty or not a string");
    }
    if (!text) {
        throw new Error("Message text is empty");
    }

    // Enhanced regex to catch more TikTok URL formats
    const urlMatch = text.match(
        /(https?:\/\/(?:www\.|vm\.|vt\.|m\.)?tiktok\.com\/(?:@[\w.-]+\/video\/\d+|[\w.-]+\/|v\/|t\/|embed\/|video\/|(?:[^\s/]+)\/?))/i
    );

    if (
        !urlMatch ||
        urlMatch.length < 1 ||
        !urlMatch[0] ||
        typeof urlMatch[0] !== "string"
    )
        throw new Error("Invalid TikTok URL");

    return urlMatch[0];
}

/**
 * Validates a TikTok URL for security
 * @param url The URL to validate
 * @throws Error If URL is invalid or suspicious
 */
export function validateTikTokUrl(url: string): void {
    try {
        const urlObj = new URL(url);
        if (!config.VALID_TIKTOK_DOMAINS.includes(urlObj.hostname)) {
            throw new Error(`Invalid TikTok domain: ${urlObj.hostname}`);
        }
        // Prevent command injection by checking for suspicious characters
        if (/[;&|`$]/.test(url)) {
            throw new Error("URL contains potentially dangerous characters");
        }
    } catch (error) {
        throw new Error(`Invalid URL format: ${(error as Error).message}`);
    }
}
