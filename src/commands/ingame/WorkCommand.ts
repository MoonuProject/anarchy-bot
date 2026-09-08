import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";
import { formatCooldown } from "../../services/minecraft/GamblingCooldownService";

export class WorkCommand extends Command {
	constructor() {
		super({
			name: "work",
			aliases: ["lamviec", "cuoc", "kiemtien"],
			description: "Làm việc kiếm từ 50 - 250 xu ảo (hồi chiêu 15m)",
			usage: "!work",
			inGameUsage: "!work",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Lệnh !work hoạt động trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, serverHost } = ctx;
		const res = await EconomyService.work(serverHost, sender, sender);

		if (!res.success) {
			const timeText = formatCooldown(res.cooldownSeconds || 0);
			return `[Làm Việc] Bạn đã làm việc vất vả rồi! Hãy đợi thêm ${timeText} nữa nhé.`;
		}

		const starterMsg = res.isNewUser
			? ` [Tân thủ: +${EconomyService.INITIAL_STARTER_COINS} xu!]`
			: "";

		return `[Làm Việc] ${res.flavorText} ${res.earned} xu!${starterMsg}`;
	}
}
