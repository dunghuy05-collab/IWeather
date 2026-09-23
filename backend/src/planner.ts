import type { TravelRequest } from "./schema.js";

export type TravelPlan = {
  request_id: string;
  content: string;
  model: string;
  generated_at: string;
};

export function createTravelPlan(request: TravelRequest): TravelPlan {
  const dailyBudget = request.budget / request.duration_days;
  const content = [
    "Trip overview",
    `Destination: ${request.destination}`,
    `Style: ${request.travel_style}`,
    `Duration: ${request.duration_days} days`,
    `Budget: about ${formatMoney(request.budget, request.currency)} total, or ${formatMoney(dailyBudget, request.currency)} per day.`,
    "",
    "Suggested itinerary",
    ...Array.from({ length: request.duration_days }, (_, index) =>
      dayPlan(index + 1, request.destination, request.interests),
    ),
    "",
    "Budget guide",
    `- Lodging: ${formatMoney(request.budget * 0.4, request.currency)}`,
    `- Food and cafes: ${formatMoney(request.budget * 0.25, request.currency)}`,
    `- Transport: ${formatMoney(request.budget * 0.15, request.currency)}`,
    `- Activities and buffer: ${formatMoney(request.budget * 0.2, request.currency)}`,
    "",
    "Assumptions",
    "This is a planning draft based on saved preferences. Confirm opening hours, live prices, weather, and local transit before booking.",
    request.notes ? `Traveler notes: ${request.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    request_id: request.id,
    content,
    model: "local-rule-planner",
    generated_at: new Date().toISOString(),
  };
}

function dayPlan(day: number, destination: string, interests: string[]): string {
  const primaryInterest = interests[(day - 1) % interests.length] ?? "local culture";
  return [
    `Day ${day}:`,
    `- Morning: Start with a relaxed neighborhood walk in ${destination} and a practical breakfast stop.`,
    `- Afternoon: Build the main activity around ${primaryInterest}. Keep one backup indoor option.`,
    "- Evening: Choose dinner near the stay area and leave room for rest or a short scenic walk.",
  ].join("\n");
}

function formatMoney(value: number, currency: string): string {
  return `${Math.round(value).toLocaleString()} ${currency}`;
}
