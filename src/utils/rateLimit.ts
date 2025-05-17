import config from "../config";

// User rate limits map
const userRateLimits = new Map<string, number[]>();

/**
 * Checks if a user is rate limited
 * @param userId The user ID to check
 * @returns True if rate limited, false otherwise
 */
export function isRateLimited(userId: string): boolean {
    const now = Date.now();
    const userRequests = userRateLimits.get(userId) || [];

    // Remove requests older than the window
    const recentRequests = userRequests.filter(
        (time) => now - time < config.RATE_LIMIT_WINDOW_MS
    );

    // Update the map with recent requests
    userRateLimits.set(userId, recentRequests);

    // Check if user has more than the max allowed requests
    return recentRequests.length >= config.RATE_LIMIT_MAX_REQUESTS;
}

/**
 * Records a request for a user
 * @param userId The user ID
 */
export function recordRequest(userId: string): void {
    const userRequests = userRateLimits.get(userId) || [];
    userRequests.push(Date.now());
    userRateLimits.set(userId, userRequests);
}
