import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";
import { GamblingCooldownService, formatCooldown, sleep } from "../../services/minecraft/GamblingCooldownService";
import { ChatPriority } from "../../services/minecraft/ChatQueueService";

export class BauCuaCommand extends Command {
	private static readonly MASCOTS: { [key: string]: string } = {
		bau: "Bầu",
		cua: "Cua",
		tom: "Tôm",
		ca: "Cá",
		ga: "Gà",
		nai: "Nai",
	};

	constructor() {
		super({
			name: "baucua",
			aliases: ["bc", "baucuatomca"],
			description: "Minigame Bầu Cua Tôm Cá truyền thống Việt Nam (6 linh vật, hồi chiêu 30s)",
			usage: "!bc <bau|cua|tom|ca|ga|nai> <số_xu>",
			inGameUsage: "!bc <bau|cua|tom|ca|ga|nai> <số_xu>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Minigame Bầu Cua !bc hoạt động trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost, bot } = ctx;

		if (args.length < 2) {
			return "[Bầu Cua] Cú pháp: !bc <bau|cua|tom|ca|ga|nai> <số_xu>. Ví dụ: !bc cua 100 hoặc !bc tom 50";
		}

		const choiceRaw = args[0].toLowerCase();
		let choice: string | null = null;

		if (choiceRaw.startsWith("b")) choice = "bau";
		else if (choiceRaw.startsWith("cu")) choice = "cua";
		else if (choiceRaw.startsWith("t")) choice = "tom";
		else if (choiceRaw.startsWith("ca")) choice = "ca";
		else if (choiceRaw.startsWith("g")) choice = "ga";
		else if (choiceRaw.startsWith("n")) choice = "nai";

		if (!choice || !BauCuaCommand.MASCOTS[choice]) {
			return "[Bầu Cua] Linh vật không hợp lệ! Vui lòng chọn một trong: bau (Bầu), cua (Cua), tom (Tôm), ca (Cá), ga (Gà), nai (Nai).";
		}

		const betAmount = parseInt(args[1], 10);
		if (isNaN(betAmount) || betAmount <= 0) {
			return "[Bầu Cua] Số tiền cược phải là số nguyên dương lớn hơn 0!";
		}

		// Active game check to prevent concurrent rolls
		if (GamblingCooldownService.isGameActive(serverHost, sender)) {
			return "[Bầu Cua] Bạn đang có một ván cược đang mở đĩa, vui lòng đợi kết quả!";
		}

		// Cooldown check (30s)
		const remainingCd = GamblingCooldownService.getRemainingCooldown(serverHost, sender);
		if (remainingCd > 0) {
			return `[Bầu Cua] Lệnh đang trong thời gian hồi chiêu! Vui lòng đợi thêm ${formatCooldown(remainingCd)} nữa.`;
		}

		// Deduct bet amount
		const deductRes = await EconomyService.deductBalance(serverHost, sender, sender, betAmount, false);
		if (!deductRes.success) {
			return `[Bầu Cua] Số dư không đủ! Bạn chỉ có ${deductRes.remaining.toLocaleString("vi-VN")} xu.`;
		}

		GamblingCooldownService.setGameActive(serverHost, sender, true);
		try {
			// Roll 3 dice (choose 3 random mascots from list)
			const mascotKeys = Object.keys(BauCuaCommand.MASCOTS);
			const r1 = mascotKeys[Math.floor(Math.random() * mascotKeys.length)];
			const r2 = mascotKeys[Math.floor(Math.random() * mascotKeys.length)];
			const r3 = mascotKeys[Math.floor(Math.random() * mascotKeys.length)];

			const m1 = BauCuaCommand.MASCOTS[r1];
			const m2 = BauCuaCommand.MASCOTS[r2];
			const m3 = BauCuaCommand.MASCOTS[r3];

			// Stage 1: Reveal first mascot
			bot.chatQueue.sendWhisper(sender, `[Bầu Cua] Đang mở đĩa: [ ${m1} - ... - ... ]`, ChatPriority.COMMAND);
			await sleep(1200);

			// Stage 2: Reveal second mascot
			bot.chatQueue.sendWhisper(sender, `[Bầu Cua] Đang mở đĩa: [ ${m1} - ${m2} - ... ]`, ChatPriority.COMMAND);
			await sleep(1200);

			const rollDisplay = `[ ${m1} - ${m2} - ${m3} ]`;

			// Count matches
			const matchCount = [r1, r2, r3].filter(k => k === choice).length;
			const chosenLabel = BauCuaCommand.MASCOTS[choice];

			if (matchCount > 0) {
				// Won: Refund bet + matchCount * bet
				const payout = betAmount + matchCount * betAmount;
				await EconomyService.addBalance(serverHost, sender, sender, payout, true);
				return `[Bầu Cua] Kết quả: ${rollDisplay}. CHÚC MỪNG! Trúng ${matchCount} con ${chosenLabel}. Bạn đã nhận được +${payout.toLocaleString("vi-VN")} xu`;
			} else {
				await EconomyService.deductBalance(serverHost, sender, sender, 0, true);
				return `[Bầu Cua] Kết quả: ${rollDisplay}. KHÔNG TRÚNG! Bạn đã thua -${betAmount.toLocaleString("vi-VN")} xu.`;
			}
		} finally {
			GamblingCooldownService.setGameActive(serverHost, sender, false);
			GamblingCooldownService.setCooldown(serverHost, sender);
		}
	}
}

