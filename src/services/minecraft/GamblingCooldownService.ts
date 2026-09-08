export class GamblingCooldownService {
	public static readonly COOLDOWN_SECONDS = 30; // 30 seconds cooldown per gamble
	private static activeGames: Set<string> = new Set();
	private static cooldowns: Map<string, number> = new Map();

	private static getKey(server: string, username: string): string {
		return `${server.toLowerCase().trim()}:${username.toLowerCase().trim()}`;
	}

	/**
	 * Check if the player currently has an active in-progress gambling roll/animation
	 */
	public static isGameActive(server: string, username: string): boolean {
		return this.activeGames.has(this.getKey(server, username));
	}

	/**
	 * Set or clear the player's active gambling state
	 */
	public static setGameActive(server: string, username: string, active: boolean): void {
		const key = this.getKey(server, username);
		if (active) {
			this.activeGames.add(key);
		} else {
			this.activeGames.delete(key);
		}
	}

	/**
	 * Get remaining cooldown in seconds for a player
	 */
	public static getRemainingCooldown(server: string, username: string): number {
		const key = this.getKey(server, username);
		const lastUsed = this.cooldowns.get(key) || 0;
		const now = Date.now();
		const elapsed = (now - lastUsed) / 1000;
		const remaining = Math.ceil(this.COOLDOWN_SECONDS - elapsed);
		return remaining > 0 ? remaining : 0;
	}

	/**
	 * Set cooldown timestamp after a game completes
	 */
	public static setCooldown(server: string, username: string, seconds: number = this.COOLDOWN_SECONDS): void {
		const key = this.getKey(server, username);
		this.cooldowns.set(key, Date.now() - (this.COOLDOWN_SECONDS - seconds) * 1000);
	}
}

/**
 * Format duration in seconds to standard unified "Xh Ym Zs" (e.g. 30s, 15m 30s, 1h 20m)
 */
export function formatCooldown(totalSeconds: number): string {
	if (totalSeconds <= 0) return "0s";
	const hours = Math.floor(totalSeconds / 3600);
	const mins = Math.floor((totalSeconds % 3600) / 60);
	const secs = totalSeconds % 60;

	const parts: string[] = [];
	if (hours > 0) parts.push(`${hours}h`);
	if (mins > 0) parts.push(`${mins}m`);
	if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

	return parts.join(" ");
}

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

