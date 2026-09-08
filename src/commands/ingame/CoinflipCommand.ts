import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";
import { GamblingCooldownService, formatCooldown, sleep } from "../../services/minecraft/GamblingCooldownService";
import { ChatPriority } from "../../services/minecraft/ChatQueueService";

export class CoinflipCommand extends Command {
	constructor() {
		super({
			name: "coinflip",
			aliases: ["cf", "tungdongxu", "nguasap"],
			description: "Minigame tung đồng xu ngửa / sấp nhân đôi tiền cược (x2, hồi chiêu 30s)",
			usage: "!cf <ngua|sap> <số_xu>",
			inGameUsage: "!cf <ngua|sap> <số_xu>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Minigame !cf hoạt động trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost, bot } = ctx;

		if (args.length < 2) {
			return "[Coinflip] Cú pháp: !cf <ngua|sap> <số_xu>. Ví dụ: !cf ngua 100 hoặc !cf sap 50";
		}

		const choiceRaw = args[0].toLowerCase();
		let choice: "ngua" | "sap" | null = null;
		if (choiceRaw === "ngua" || choiceRaw === "n" || choiceRaw === "heads" || choiceRaw === "h") {
			choice = "ngua";
		} else if (choiceRaw === "sap" || choiceRaw === "s" || choiceRaw === "tails" || choiceRaw === "t") {
			choice = "sap";
		}

		if (!choice) {
			return "[Coinflip] Lựa chọn không hợp lệ! Vui lòng chọn 'ngua' (Ngửa) hoặc 'sap' (Sấp).";
		}

		const betAmount = parseInt(args[1], 10);
		if (isNaN(betAmount) || betAmount <= 0) {
			return "[Coinflip] Số tiền cược phải là số nguyên dương lớn hơn 0!";
		}

		// Active game check to prevent concurrent rolls
		if (GamblingCooldownService.isGameActive(serverHost, sender)) {
			return "[Coinflip] Bạn đang có một ván cược đang xoay, vui lòng đợi kết quả!";
		}

		// Cooldown check (30s)
		const remainingCd = GamblingCooldownService.getRemainingCooldown(serverHost, sender);
		if (remainingCd > 0) {
			return `[Coinflip] Lệnh đang trong thời gian hồi chiêu! Vui lòng đợi thêm ${formatCooldown(remainingCd)} nữa.`;
		}

		// Deduct bet amount first
		const deductRes = await EconomyService.deductBalance(serverHost, sender, sender, betAmount, false);
		if (!deductRes.success) {
			return `[Coinflip] Số dư không đủ! Bạn chỉ có ${deductRes.remaining.toLocaleString("vi-VN")} xu.`;
		}

		GamblingCooldownService.setGameActive(serverHost, sender, true);
		try {
			// Stage 1: Coin spinning in the air
			bot.chatQueue.sendWhisper(sender, "[Coinflip] Đồng xu đang quay tít trên không trung... [ ... ]", ChatPriority.COMMAND);
			await sleep(1200);

			// Stage 2: Coin landing
			bot.chatQueue.sendWhisper(sender, "[Coinflip] Đồng xu đang rơi xuống mặt đất...", ChatPriority.COMMAND);
			await sleep(1200);

			// Flip coin
			const result: "ngua" | "sap" = Math.random() < 0.5 ? "ngua" : "sap";
			const isWin = choice === result;
			const resultLabel = result === "ngua" ? "NGỬA" : "SẤP";

			if (isWin) {
				const wonAmount = betAmount * 2;
				await EconomyService.addBalance(serverHost, sender, sender, wonAmount, true);
				return `[Coinflip] Kết quả: [${resultLabel}]. CHÚC MỪNG! Bạn đã đoán đúng và nhận được +${wonAmount.toLocaleString("vi-VN")} xu`;
			} else {
				await EconomyService.deductBalance(serverHost, sender, sender, 0, true);
				return `[Coinflip] Kết quả: [${resultLabel}]. RẤT TIẾC! Bạn đã thua -${betAmount.toLocaleString("vi-VN")} xu`;
			}
		} finally {
			GamblingCooldownService.setGameActive(serverHost, sender, false);
			GamblingCooldownService.setCooldown(serverHost, sender);
		}
	}
}

