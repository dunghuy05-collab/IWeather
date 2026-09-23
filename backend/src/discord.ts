import type { TravelRequest } from "./schema.js";

export async function notifyDiscord(request: TravelRequest): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(5_000),
    body: JSON.stringify({
      username: "WanderMind",
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: `✈️ Yêu cầu mới: ${request.destination}`,
          color: 0xc55d32,
          fields: [
            {
              name: "Ngân sách",
              value: `${request.budget.toLocaleString()} ${request.currency}`,
              inline: true,
            },
            { name: "Thời lượng", value: `${request.duration_days} ngày`, inline: true },
            { name: "Phong cách", value: request.travel_style, inline: true },
            { name: "Sở thích", value: request.interests.join(", ") },
            { name: "Mã yêu cầu", value: `\`${request.id}\`` },
          ],
          timestamp: request.created_at,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook returned HTTP ${response.status}`);
  }
  return true;
}

