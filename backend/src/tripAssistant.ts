type Coordinates = {
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
};

export type TripAssistantInput = {
  from: string;
  to: string;
  days?: number;
  people?: number;
  vehicle?: "car" | "motorbike";
  fuelConsumption?: number;
};

type WeatherSummary = {
  minTemperature: number;
  maxTemperature: number;
  rainTotal: number;
  summary: string;
};

type RouteSummary = {
  distanceKm: number;
  durationHours: number;
};

const DEFAULT_FUEL_PRICE_VND = 24_000;
const DEFAULT_CONSUMPTION_BY_VEHICLE = {
  car: 7.5,
  motorbike: 2.2,
} as const;

export async function createTripAssistantReply(input: TripAssistantInput): Promise<string> {
  const normalized = normalizeTripInput(input);
  const [from, to] = await Promise.all([
    geocode(normalized.from),
    geocode(normalized.to),
  ]);

  if (!from || !to) {
    return [
      "I could not find one of those places.",
      `From: ${normalized.from}`,
      `To: ${normalized.to}`,
      "Try using a more specific city/province name, for example: Ho Chi Minh City to Da Lat.",
    ].join("\n");
  }

  const [weather, route] = await Promise.all([
    getWeather(to, normalized.days),
    getRoute(from, to),
  ]);

  const fuel = estimateFuelCost(
    route?.distanceKm,
    normalized.vehicle,
    normalized.fuelConsumption,
  );

  return formatTripReply({
    from,
    to,
    days: normalized.days,
    people: normalized.people,
    vehicle: normalized.vehicle,
    weather,
    route,
    fuel,
  });
}

function normalizeTripInput(input: TripAssistantInput): Required<TripAssistantInput> {
  return {
    from: input.from.trim(),
    to: input.to.trim(),
    days: clamp(Math.trunc(input.days ?? 3), 1, 7),
    people: clamp(Math.trunc(input.people ?? 2), 1, 20),
    vehicle: input.vehicle ?? "car",
    fuelConsumption: input.fuelConsumption ?? 0,
  };
}

async function geocode(query: string): Promise<Coordinates | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;
  const data = (await response.json()) as {
    results?: Array<{
      name: string;
      country?: string;
      latitude: number;
      longitude: number;
    }>;
  };
  const result = data.results?.[0];
  return result
    ? {
        name: result.name,
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
      }
    : null;
}

async function getWeather(destination: Coordinates, days: number): Promise<WeatherSummary | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(destination.latitude));
  url.searchParams.set("longitude", String(destination.longitude));
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum");
  url.searchParams.set("forecast_days", String(days));
  url.searchParams.set("timezone", "auto");

  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;
  const data = (await response.json()) as {
    daily?: {
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_sum?: number[];
    };
  };

  const maxValues = data.daily?.temperature_2m_max ?? [];
  const minValues = data.daily?.temperature_2m_min ?? [];
  const rainValues = data.daily?.precipitation_sum ?? [];
  if (!maxValues.length || !minValues.length) return null;

  const rainTotal = sum(rainValues);
  return {
    minTemperature: Math.round(Math.min(...minValues)),
    maxTemperature: Math.round(Math.max(...maxValues)),
    rainTotal: Math.round(rainTotal * 10) / 10,
    summary: rainTotal > 20 ? "rain likely" : rainTotal > 3 ? "some rain possible" : "mostly dry",
  };
}

async function getRoute(from: Coordinates, to: Coordinates): Promise<RouteSummary | null> {
  const path = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url = new URL(`https://router.project-osrm.org/route/v1/driving/${path}`);
  url.searchParams.set("overview", "false");
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("steps", "false");

  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;
  const data = (await response.json()) as {
    routes?: Array<{ distance: number; duration: number }>;
  };
  const route = data.routes?.[0];
  return route
    ? {
        distanceKm: Math.round(route.distance / 100) / 10,
        durationHours: Math.round((route.duration / 3600) * 10) / 10,
      }
    : null;
}

function estimateFuelCost(
  distanceKm: number | undefined,
  vehicle: "car" | "motorbike",
  fuelConsumption: number,
) {
  if (!distanceKm) return null;
  const consumption =
    fuelConsumption > 0 ? fuelConsumption : DEFAULT_CONSUMPTION_BY_VEHICLE[vehicle];
  const fuelPrice = Number(process.env.FUEL_PRICE_PER_LITER_VND ?? DEFAULT_FUEL_PRICE_VND);
  const liters = (distanceKm * consumption) / 100;
  return {
    consumption,
    fuelPrice,
    liters: Math.round(liters * 10) / 10,
    cost: Math.round(liters * fuelPrice),
  };
}

function formatTripReply(input: {
  from: Coordinates;
  to: Coordinates;
  days: number;
  people: number;
  vehicle: "car" | "motorbike";
  weather: WeatherSummary | null;
  route: RouteSummary | null;
  fuel: ReturnType<typeof estimateFuelCost>;
}): string {
  const homestayQuery = encodeURIComponent(`homestay ${input.to.name}`);
  const mapsUrl = `https://www.google.com/maps/search/${homestayQuery}`;
  const bookingUrl = `https://www.booking.com/searchresults.html?ss=${homestayQuery}`;

  return [
    `Trip brief: ${placeLabel(input.from)} -> ${placeLabel(input.to)} (${input.days} days, ${input.people} people)`,
    "",
    "Homestay search",
    `- Google Maps: ${mapsUrl}`,
    `- Booking search: ${bookingUrl}`,
    "",
    "Weather",
    input.weather
      ? `- ${input.weather.minTemperature}-${input.weather.maxTemperature} C, ${input.weather.summary}, total rain around ${input.weather.rainTotal} mm for the selected days.`
      : "- Weather lookup is temporarily unavailable.",
    "",
    "Travel time",
    input.route
      ? `- Around ${input.route.distanceKm.toLocaleString()} km, about ${input.route.durationHours} hours by driving route.`
      : "- Route lookup is temporarily unavailable.",
    "",
    "Fuel estimate",
    input.fuel
      ? `- ${input.vehicle}, ${input.fuel.consumption} L/100km, ${input.fuel.liters} L, about ${input.fuel.cost.toLocaleString()} VND at ${input.fuel.fuelPrice.toLocaleString()} VND/L.`
      : "- Fuel estimate is unavailable because route distance is missing.",
    "",
    "Note: homestay links are search links, weather and route are estimates. Confirm prices, availability, and road conditions before booking.",
  ].join("\n");
}

async function fetchWithTimeout(url: URL): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(7_000) });
}

function placeLabel(place: Coordinates): string {
  return place.country ? `${place.name}, ${place.country}` : place.name;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
