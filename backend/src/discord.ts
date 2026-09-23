import type { TravelRequest } from "./schema.js";

export async function notifyDiscord(request: TravelRequest): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const notes = request.notes?.trim();
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(5_000),
    body: JSON.stringify({
      username: "WanderMind",
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: `New travel request: ${request.destination}`,
          color: 0xc55d32,
          description: notes ? notes.slice(0, 500) : undefined,
          fields: [
            {
              name: "Budget",
              value: `${request.budget.toLocaleString()} ${request.currency}`,
              inline: true,
            },
            { name: "Duration", value: `${request.duration_days} days`, inline: true },
            { name: "Style", value: request.travel_style, inline: true },
            { name: "Interests", value: request.interests.join(", ") },
            { name: "Request ID", value: `\`${request.id}\`` },
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
