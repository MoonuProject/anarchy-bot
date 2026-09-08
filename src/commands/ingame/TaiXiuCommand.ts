import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";
import { GamblingCooldownService, formatCooldown, sleep } from "../../services/minecraft/GamblingCooldownService";
import { ChatPriority } from "../../services/minecraft/ChatQueueService";

export class TaiXiuCommand extends Command {
	constructor() {
		super({
			name: "taixiu",
			aliases: ["tx", "xidach"],
			description: "Minigame Tài Xỉu 3 xúc xắc truyền thống Việt Nam (hồi chiêu 30s)",
			usage: "!tx <tai|xiu> <số_xu>",
			inGameUsage: "!tx <tai|xiu> <số_xu>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Minigame Tài Xỉu !tx hoạt động trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost, bot } = ctx;

		if (args.length < 2) {
			return "[Tài Xỉu] Cú pháp: !tx <tai|xiu> <số_xu>. Ví dụ: !tx tai 100 hoặc !tx xiu 50";
		}

		const choiceRaw = args[0].toLowerCase();
		let choice: "tai" | "xiu" | null = null;
		if (choiceRaw === "tai" || choiceRaw === "t" || choiceRaw === "over") {
			choice = "tai";
		} else if (choiceRaw === "xiu" || choiceRaw === "x" || choiceRaw === "under") {
			choice = "xiu";
		}

		if (!choice) {
			return "[Tài Xỉu] Lựa chọn không hợp lệ! Vui lòng chọn 'tai' (Tài: 11-17) hoặc 'xiu' (Xỉu: 4-10).";
		}

		const betAmount = parseInt(args[1], 10);
		if (isNaN(betAmount) || betAmount <= 0) {
			return "[Tài Xỉu] Số tiền cược phải là số nguyên dương lớn hơn 0!";
		}

		// Active game check to prevent concurrent rolls
		if (GamblingCooldownService.isGameActive(serverHost, sender)) {
			return "[Tài Xỉu] Bạn đang có một ván cược đang mở bát, vui lòng đợi kết quả!";
		}

		// Cooldown check (30s)
		const remainingCd = GamblingCooldownService.getRemainingCooldown(serverHost, sender);
		if (remainingCd > 0) {
			return `[Tài Xỉu] Lệnh đang trong thời gian hồi chiêu! Vui lòng đợi thêm ${formatCooldown(remainingCd)} nữa.`;
		}

		// Deduct bet amount
		const deductRes = await EconomyService.deductBalance(serverHost, sender, sender, betAmount, false);
		if (!deductRes.success) {
			return `[Tài Xỉu] Số dư không đủ! Bạn chỉ có ${deductRes.remaining.toLocaleString("vi-VN")} xu.`;
		}

		GamblingCooldownService.setGameActive(serverHost, sender, true);
		try {
			// Roll 3 dice
			const d1 = Math.floor(Math.random() * 6) + 1;
			const d2 = Math.floor(Math.random() * 6) + 1;
			const d3 = Math.floor(Math.random() * 6) + 1;
			const total = d1 + d2 + d3;
			const isBao = d1 === d2 && d2 === d3;

			// Stage 1: Reveal first die
			bot.chatQueue.sendWhisper(sender, `[Tài Xỉu] Đang mở bát: [ ${d1} - ... - ... ]`, ChatPriority.COMMAND);
			await sleep(1200);

			// Stage 2: Reveal second die
			bot.chatQueue.sendWhisper(sender, `[Tài Xỉu] Đang mở bát: [ ${d1} - ${d2} - ... ]`, ChatPriority.COMMAND);
			await sleep(1200);

			const diceStr = `[ ${d1} - ${d2} - ${d3} ] (Tổng: ${total})`;

			// Check Bao (Triple)
			if (isBao) {
				await EconomyService.deductBalance(serverHost, sender, sender, 0, true);
				return `[Tài Xỉu] Xúc xắc: ${diceStr} -> RA BÃO (Bộ ba đồng nhất)! Nhà cái ăn hết. Bạn đã thua -${betAmount.toLocaleString("vi-VN")} xu.`;
			}

			const outcome = total >= 11 ? "tai" : "xiu";
			const outcomeLabel = outcome === "tai" ? "TÀI" : "XỈU";
			const isWin = choice === outcome;

			if (isWin) {
				const wonAmount = betAmount * 2;
				await EconomyService.addBalance(serverHost, sender, sender, wonAmount, true);
				return `[Tài Xỉu] Xúc xắc: ${diceStr} -> Kết quả: [${outcomeLabel}]. Bạn đã nhận được +${wonAmount.toLocaleString("vi-VN")} xu`;
			} else {
				await EconomyService.deductBalance(serverHost, sender, sender, 0, true);
				return `[Tài Xỉu] Xúc xắc: ${diceStr} -> Kết quả: [${outcomeLabel}]. Bạn đã thua -${betAmount.toLocaleString("vi-VN")} xu`;
			}
		} finally {
			GamblingCooldownService.setGameActive(serverHost, sender, false);
			GamblingCooldownService.setCooldown(serverHost, sender);
		}
	}
}

