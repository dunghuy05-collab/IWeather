import { z } from "zod";

export const travelStyles = [
  "backpacking",
  "comfort",
  "luxury",
  "family",
  "adventure",
  "culture",
] as const;

export const travelRequestSchema = z.object({
  destination: z.string().trim().min(2).max(120),
  budget: z.coerce.number().positive().max(1_000_000_000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  duration_days: z.coerce.number().int().min(1).max(365),
  travel_style: z.enum(travelStyles),
  interests: z
    .array(z.string().trim().min(1).max(60))
    .min(1)
    .max(10)
    .transform((values) => [...new Set(values.map((value) => value.toLowerCase()))]),
  notes: z.string().trim().max(1000).nullable().optional().default(null),
});

export type TravelRequestInput = z.infer<typeof travelRequestSchema>;

export type TravelRequest = TravelRequestInput & {
  id: string;
  created_at: string;
};

