import { createPublicKey, verify } from "node:crypto";

import type { FastifyBaseLogger } from "fastify";

import { createTripAssistantReply, type TripAssistantInput } from "./tripAssistant.js";

type DiscordOption = {
  name: string;
  type: number;
  value?: string | number | boolean;
};

type DiscordInteraction = {
  type: number;
  token?: string;
  application_id?: string;
  data?: {
    name?: string;
    options?: DiscordOption[];
  };
};

type HandleInteractionOptions = {
  interaction: DiscordInteraction;
  logger: FastifyBaseLogger;
};

const InteractionType = {
  Ping: 1,
  ApplicationCommand: 2,
} as const;

const InteractionResponseType = {
  Pong: 1,
  ChannelMessageWithSource: 4,
  DeferredChannelMessageWithSource: 5,
} as const;

export const tripCommandDefinition = {
  name: "trip",
  description: "Plan homestay, weather, travel time, and fuel estimate.",
  type: 1,
  options: [
    {
      name: "from",
      description: "Starting city or place.",
      type: 3,
      required: true,
    },
    {
      name: "to",
      description: "Destination city or place.",
      type: 3,
      required: true,
    },
    {
      name: "days",
      description: "Trip length, 1 to 7 days.",
      type: 4,
      required: false,
      min_value: 1,
      max_value: 7,
    },
    {
      name: "people",
      description: "Number of travelers.",
      type: 4,
      required: false,
      min_value: 1,
      max_value: 20,
    },
    {
      name: "vehicle",
      description: "Vehicle for fuel estimate.",
      type: 3,
      required: false,
      choices: [
        { name: "Car", value: "car" },
        { name: "Motorbike", value: "motorbike" },
      ],
    },
    {
      name: "fuel_consumption",
      description: "Optional L/100km fuel consumption.",
      type: 10,
      required: false,
      min_value: 0.5,
      max_value: 30,
    },
  ],
};

export function verifyDiscordRequest(rawBody: string, signature: string, timestamp: string): boolean {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return false;

  try {
    const key = createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(publicKey, "hex"),
      ]),
      format: "der",
      type: "spki",
    });
    return verify(null, Buffer.from(timestamp + rawBody), key, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export async function handleDiscordInteraction({
  interaction,
  logger,
}: HandleInteractionOptions) {
  if (interaction.type === InteractionType.Ping) {
    return { type: InteractionResponseType.Pong };
  }

  if (
    interaction.type !== InteractionType.ApplicationCommand ||
    interaction.data?.name !== tripCommandDefinition.name
  ) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: "Unknown command.", flags: 64 },
    };
  }

  if (!interaction.application_id || !interaction.token) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: "Discord interaction payload is missing required data.", flags: 64 },
    };
  }

  const input = parseTripOptions(interaction.data.options ?? []);
  queueTripFollowup(interaction.application_id, interaction.token, input, logger);

  return {
    type: InteractionResponseType.DeferredChannelMessageWithSource,
  };
}

function parseTripOptions(options: DiscordOption[]): TripAssistantInput {
  const values = new Map(options.map((option) => [option.name, option.value]));
  const vehicle = values.get("vehicle");
  return {
    from: String(values.get("from") ?? ""),
    to: String(values.get("to") ?? ""),
    days: numberOption(values.get("days")),
    people: numberOption(values.get("people")),
    vehicle: vehicle === "motorbike" ? "motorbike" : "car",
    fuelConsumption: numberOption(values.get("fuel_consumption")),
  };
}

function queueTripFollowup(
  applicationId: string,
  interactionToken: string,
  input: TripAssistantInput,
  logger: FastifyBaseLogger,
) {
  setImmediate(() => {
    void createTripAssistantReply(input)
      .then((content) => sendInteractionFollowup(applicationId, interactionToken, content))
      .catch((error) => {
        logger.error({ error }, "Discord trip command failed");
        return sendInteractionFollowup(
          applicationId,
          interactionToken,
          "I could not complete the trip lookup right now. Please try again in a moment.",
        );
      });
  });
}

async function sendInteractionFollowup(
  applicationId: string,
  interactionToken: string,
  content: string,
) {
  const url = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: trimDiscordMessage(content), allowed_mentions: { parse: [] } }),
  });

  if (!response.ok) {
    throw new Error(`Discord followup returned HTTP ${response.status}`);
  }
}

function numberOption(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function trimDiscordMessage(content: string): string {
  return content.length > 1900 ? `${content.slice(0, 1890)}\n...` : content;
}
