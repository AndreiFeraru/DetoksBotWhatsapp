/**
 * Configuration for the TikTok WhatsApp bot
 */
export interface Config {
    VIDEOS_PATH: string;
    AUTH_INFO_PATH: string;
    DEFAULT_VIDEO_TITLE: string;
    RATE_LIMIT_WINDOW_MS: number;
    RATE_LIMIT_MAX_REQUESTS: number;
    DELIVERY_DELETE_DELAY_MS: number;
    FAILSAFE_DELETE_DELAY_MS: number;
    MAX_CONCURRENT_DOWNLOADS: number;
    VALID_TIKTOK_DOMAINS: string[];
}

const config: Config = {
    // Paths
    VIDEOS_PATH: "./videos",
    AUTH_INFO_PATH: "./auth_info",

    // Video settings
    DEFAULT_VIDEO_TITLE: "video",

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
    RATE_LIMIT_MAX_REQUESTS: 5, // 5 requests per minute

    // File cleanup
    DELIVERY_DELETE_DELAY_MS: 2000, // 2 seconds after delivery
    FAILSAFE_DELETE_DELAY_MS: 30000, // 30 seconds regardless

    // Download settings
    MAX_CONCURRENT_DOWNLOADS: 2,

    // Valid TikTok domains
    VALID_TIKTOK_DOMAINS: [
        "tiktok.com",
        "www.tiktok.com",
        "vm.tiktok.com",
        "m.tiktok.com",
    ],
};

export default config;
