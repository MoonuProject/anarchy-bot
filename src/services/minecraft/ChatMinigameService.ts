import { Minecraft } from "../../structures";
import { EconomyService } from "./EconomyService";
import { ChatPriority } from "./ChatQueueService";

export interface IActiveMinigame {
	type: "math" | "scramble" | "typer";
	questionText: string;
	validAnswers: string[];
	displayAnswer: string;
	reward: number;
	startedAt: number;
	timeoutTimer: NodeJS.Timeout | null;
}

export class ChatMinigameService {
	private static activeGames: Map<string, IActiveMinigame> = new Map();

	private static readonly MINECRAFT_WORDS = [
		// Khoáng sản & Vật phẩm
		{ word: "kim cuong", aliases: ["kimcuong", "diamond", "kc", "kim cương"], display: "Diamond" },
		{ word: "netherite", aliases: ["netherite", "thoi netherite", "manh netherite"], display: "Netherite" },
		{ word: "ngoc ender", aliases: ["ngocender", "enderpearl", "ender pearl", "ngọc ender", "pearl"], display: "Ender Pearl" },
		{ word: "trung rong", aliases: ["trungrong", "dragon egg", "dragonegg", "trứng rồng"], display: "Dragon Egg" },
		{ word: "tao vang", aliases: ["taovang", "golden apple", "gapple", "táo vàng", "gap"], display: "Golden Apple" },
		{ word: "than da", aliases: ["thanda", "coal", "than đá", "than"], display: "Coal" },
		{ word: "canh elytra", aliases: ["canhelytra", "elytra", "cánh elytra", "canh"], display: "Elytra" },
		{ word: "hop shulker", aliases: ["hopshulker", "shulker box", "shulkerbox", "shulker", "hộp shulker"], display: "Shulker Box" },
		{ word: "dat set", aliases: ["datset", "clay", "đất sét"], display: "Clay" },
		{ word: "da do", aliases: ["dado", "redstone", "đá đỏ"], display: "Redstone" },
		{ word: "thuoc no", aliases: ["thuocno", "gunpowder", "thuốc nổ"], display: "Gunpowder" },
		{ word: "phao hoa", aliases: ["phaohoa", "firework", "fireworks", "pháo hoa"], display: "Firework" },
		{ word: "totem", aliases: ["totem of undying", "bat tu", "totem bất tử", "totem"], display: "Totem of Undying" },

		// Sinh vật (Mobs)
		{ word: "dan lang", aliases: ["danlang", "villager", "dân làng", "npc"], display: "Villager" },
		{ word: "quai no", aliases: ["quaino", "creeper", "quái nổ"], display: "Creeper" },
		{ word: "nguoi ender", aliases: ["nguoiender", "enderman", "người ender"], display: "Enderman" },
		{ word: "bo nam", aliases: ["bonam", "mooshroom", "bò nấm"], display: "Mooshroom" },
		{ word: "nguoi sat", aliases: ["nguoisat", "iron golem", "golem", "bảo vệ", "người sắt", "bo sat"], display: "Iron Golem" },
		{ word: "rong ender", aliases: ["rongender", "ender dragon", "enderdragon", "rồng ender"], display: "Ender Dragon" },
		{ word: "bo xuong", aliases: ["boxuong", "skeleton", "bộ xương"], display: "Skeleton" },

		// Khối & Dụng cụ
		{ word: "ban che tao", aliases: ["banchetao", "crafting table", "crafting", "bàn chế tạo", "workbench"], display: "Crafting Table" },
		{ word: "lo nung", aliases: ["lonung", "furnace", "lò nung"], display: "Furnace" },
		{ word: "de ren", aliases: ["deren", "anvil", "đe rèn", "đe"], display: "Anvil" },
		{ word: "da nen", aliases: ["danen", "bedrock", "đá nền"], display: "Bedrock" },
		{ word: "da hac dien", aliases: ["dahacdien", "obsidian", "hac dien thach", "đá hắc diện"], display: "Obsidian" }
	];

	private static readonly TYPER_CODES = [
		"anarchy-vietnam-2026",
		"mo0nbot",
		"minecraft",
		"survival",
		"hardcore",
		"2y2c-vietnam"
	];

	/**
	 * Chuẩn hóa text: xóa dấu tiếng Việt, ký tự đặc biệt và khoảng trắng thừa
	 */
	private static normalizeText(text: string): string {
		return text
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/đ/g, "d")
			.replace(/[^a-z0-9]/g, ""); // gom hết về liền nhau: "kim cuong" -> "kimcuong"
	}

	public static hasActiveMinigame(server: string): boolean {
		const s = server.toLowerCase().trim();
		return this.activeGames.has(s);
	}

	public static startRandomMinigame(bot: Minecraft): void {
		if (!bot.joined || !bot.config?.connection?.host) return;
		const server = bot.config.connection.host.toLowerCase().trim();

		if (this.activeGames.has(server)) return;

		const types: ("math" | "scramble" | "typer")[] = ["math", "scramble", "typer"];
		const chosenType = types[Math.floor(Math.random() * types.length)];

		let questionText = "";
		let validAnswers: string[] = [];
		let displayAnswer = "";
		let reward = 150;

		if (chosenType === "math") {
			const op = Math.random() > 0.4 ? "+" : Math.random() > 0.5 ? "-" : "*";
			let a = 0;
			let b = 0;
			let ans = 0;

			if (op === "+") {
				a = Math.floor(Math.random() * 80) + 15;
				b = Math.floor(Math.random() * 80) + 15;
				ans = a + b;
				reward = Math.floor(Math.random() * 51) + 100;
			} else if (op === "-") {
				a = Math.floor(Math.random() * 90) + 30;
				b = Math.floor(Math.random() * (a - 10)) + 5;
				ans = a - b;
				reward = Math.floor(Math.random() * 51) + 100;
			} else {
				a = Math.floor(Math.random() * 12) + 4;
				b = Math.floor(Math.random() * 12) + 4;
				ans = a * b;
				reward = Math.floor(Math.random() * 51) + 150;
			}

			questionText = `[Minigame] Thực hiện phép tính sau: "${a} ${op} ${b} = ?". Người nhanh nhất được ${reward} xu.`;
			displayAnswer = String(ans);
			validAnswers = [String(ans)];
		} else if (chosenType === "scramble") {
			const item = this.MINECRAFT_WORDS[Math.floor(Math.random() * this.MINECRAFT_WORDS.length)];
			reward = Math.floor(Math.random() * 51) + 150;
			questionText = `[Minigame] Hãy nhập nhanh từ sau: "${item.display}". Người nhanh nhất được ${reward} xu.`;
			displayAnswer = `${item.word.toUpperCase()} (${item.display.replace(/\s*\/\s*/g, " ")})`;
			validAnswers = [item.word, ...item.aliases];
		} else {
			const code = this.TYPER_CODES[Math.floor(Math.random() * this.TYPER_CODES.length)];
			reward = Math.floor(Math.random() * 51) + 100;
			questionText = `[Minigame] Gõ nhanh cụm từ "${code}". Người gõ nhanh nhất được ${reward} xu.`;
			displayAnswer = code;
			validAnswers = [code];
		}

		bot.chatQueue.send(questionText, ChatPriority.NORMAL);

		const timeoutTimer = setTimeout(() => {
			this.onMinigameTimeout(bot, server);
		}, 45 * 1000);

		this.activeGames.set(server, {
			type: chosenType,
			questionText,
			validAnswers: validAnswers.map(a => this.normalizeText(a)),
			displayAnswer,
			reward,
			startedAt: Date.now(),
			timeoutTimer,
		});
	}

	public static async onChatMessage(
		bot: Minecraft,
		server: string,
		senderUsername: string,
		senderDisplayName: string,
		message: string
	): Promise<boolean> {
		const s = server.toLowerCase().trim();
		const game = this.activeGames.get(s);
		if (!game) return false;

		const cleanMsg = this.normalizeText(message);
		const isCorrect = game.validAnswers.some(ans => ans === cleanMsg);

		if (isCorrect) {
			if (game.timeoutTimer) {
				clearTimeout(game.timeoutTimer);
			}
			this.activeGames.delete(s);

			await EconomyService.addBalance(s, senderUsername, senderDisplayName, game.reward, true);

			bot.chatQueue.send(
				`[Minigame] Chúc mừng ${senderDisplayName} đã trả lời đúng nhanh nhất (Đáp án: ${game.displayAnswer}) và nhận được ${game.reward} xu!`,
				ChatPriority.HIGH
			);
			return true;
		}

		return false;
	}

	private static onMinigameTimeout(bot: Minecraft, server: string): void {
		const game = this.activeGames.get(server);
		if (!game) return;

		this.activeGames.delete(server);

		if (bot.joined) {
			bot.chatQueue.send(
				`[Minigame] Đã hết thời gian! Đáp án chính xác là: "${game.displayAnswer}".`,
				ChatPriority.LOW
			);
		}
	}
}