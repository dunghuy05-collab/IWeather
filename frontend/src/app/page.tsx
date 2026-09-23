"use client";

import { FormEvent, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

const interestOptions = [
  "Food",
  "Culture",
  "Nature",
  "Beach",
  "Adventure",
  "Shopping",
  "Photography",
  "Relaxation",
];

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; id: string }
  | { status: "error"; message: string };

type PlanState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; content: string }
  | { status: "error"; message: string };

export default function Home() {
  const [interests, setInterests] = useState<string[]>([]);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [planState, setPlanState] = useState<PlanState>({ status: "idle" });

  function toggleInterest(interest: string) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (interests.length === 0) {
      setSubmitState({ status: "error", message: "Choose at least one interest." });
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitState({ status: "submitting" });
    setPlanState({ status: "idle" });

    try {
      const response = await fetch(`${apiUrl}/travel-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: form.get("destination"),
          budget: Number(form.get("budget")),
          currency: form.get("currency"),
          duration_days: Number(form.get("duration_days")),
          travel_style: form.get("travel_style"),
          interests,
          notes: form.get("notes") || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.detail?.[0]?.message ?? "Could not save the travel request.");
      }

      const result = await response.json();
      setSubmitState({ status: "success", id: result.id });
      event.currentTarget.reset();
      setInterests([]);
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "Unexpected error.",
      });
    }
  }

  async function handlePlan() {
    if (submitState.status !== "success") return;
    setPlanState({ status: "submitting" });

    try {
      const response = await fetch(`${apiUrl}/travel-requests/${submitState.id}/plan`, {
        method: "POST",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.detail ?? "Could not generate an itinerary.");
      }
      setPlanState({ status: "success", content: result.content });
    } catch (error) {
      setPlanState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not generate an itinerary.",
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f6ef] text-[#17352d]">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-10 lg:px-14">
        <nav className="flex items-center justify-between border-b border-[#17352d]/15 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#17352d] text-lg text-white">W</span>
            <div>
              <p className="font-semibold tracking-tight">WanderMind</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#557168]">AI Travel Planner</p>
            </div>
          </div>
          <span className="rounded-full border border-[#4d765f]/25 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#315b48]">
            Discord-ready
          </span>
        </nav>

        <section className="grid gap-12 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:py-16">
          <div className="lg:sticky lg:top-10">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.25em] text-[#c55d32]">Plan the trip</p>
            <h1 className="text-5xl font-semibold leading-[1.03] sm:text-6xl">
              Shape a trip request and notify the team instantly.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-[#557168]">
              Save the traveler profile, send the request to Discord through a webhook, then generate a practical first itinerary draft.
            </p>
            <div className="mt-9 grid grid-cols-3 gap-3 text-center">
              {[
                ["01", "Request"],
                ["02", "Discord"],
                ["03", "Plan"],
              ].map(([step, label]) => (
                <div className="rounded-2xl border border-[#17352d]/10 bg-white/60 px-2 py-4" key={step}>
                  <p className="text-xs font-bold text-[#c55d32]">{step}</p>
                  <p className="mt-1 text-xs text-[#557168]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <form
            className="rounded-[2rem] border border-white bg-white/85 p-6 shadow-[0_28px_80px_-45px_rgba(23,53,45,0.5)] sm:p-9"
            onSubmit={handleSubmit}
          >
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#789087]">Trip details</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Where should we go?</h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="field-label">Destination</span>
                <input className="field-input" name="destination" placeholder="Example: Da Nang, Vietnam" minLength={2} maxLength={120} required />
              </label>

              <label>
                <span className="field-label">Budget</span>
                <div className="flex gap-2">
                  <input className="field-input min-w-0 flex-1" name="budget" type="number" min="1" step="0.01" placeholder="1200" required />
                  <select className="field-input w-24" name="currency" defaultValue="USD">
                    <option>USD</option>
                    <option>VND</option>
                    <option>EUR</option>
                    <option>THB</option>
                  </select>
                </div>
              </label>

              <label>
                <span className="field-label">Days</span>
                <input className="field-input" name="duration_days" type="number" min="1" max="365" placeholder="5" required />
              </label>

              <label className="sm:col-span-2">
                <span className="field-label">Travel style</span>
                <select className="field-input" name="travel_style" defaultValue="comfort" required>
                  <option value="backpacking">Backpacking</option>
                  <option value="comfort">Comfort</option>
                  <option value="luxury">Luxury</option>
                  <option value="family">Family</option>
                  <option value="adventure">Adventure</option>
                  <option value="culture">Culture</option>
                </select>
              </label>
            </div>

            <fieldset className="mt-7">
              <legend className="field-label">Interests</legend>
              <div className="flex flex-wrap gap-2.5">
                {interestOptions.map((interest) => {
                  const selected = interests.includes(interest);
                  return (
                    <button
                      aria-pressed={selected}
                      className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                        selected
                          ? "border-[#17352d] bg-[#17352d] text-white"
                          : "border-[#17352d]/15 bg-[#f8faf6] text-[#49665c] hover:border-[#17352d]/40"
                      }`}
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      type="button"
                    >
                      {selected ? "Selected " : "Add "}
                      {interest}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-7 block">
              <span className="field-label">Notes <span className="font-normal text-[#8da097]">(optional)</span></span>
              <textarea className="field-input min-h-28 resize-y" name="notes" maxLength={1000} placeholder="Example: Traveling with kids, slower pace, prefers local food..." />
            </label>

            {submitState.status === "error" && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{submitState.message}</p>}
            {submitState.status === "success" && (
              <div className="mt-5 rounded-xl bg-[#e5f2e7] px-4 py-3 text-sm text-[#28573c]">
                <p>
                  Request saved and Discord notification queued. Trip ID: <span className="font-mono font-semibold">{submitState.id}</span>
                </p>
                <button
                  className="mt-4 rounded-xl bg-[#17352d] px-4 py-2.5 font-semibold text-white transition hover:bg-[#28573c] disabled:cursor-wait disabled:opacity-60"
                  disabled={planState.status === "submitting"}
                  onClick={handlePlan}
                  type="button"
                >
                  {planState.status === "submitting" ? "Generating itinerary..." : "Generate itinerary"}
                </button>
              </div>
            )}

            {planState.status === "error" && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{planState.message}</p>}
            {planState.status === "success" && (
              <article className="mt-5 rounded-xl border border-[#17352d]/10 bg-[#f8faf6] px-5 py-4 text-sm leading-7 text-[#315b48]">
                <h3 className="font-semibold text-[#17352d]">Suggested itinerary</h3>
                <div className="mt-2 whitespace-pre-wrap">{planState.content}</div>
              </article>
            )}

            <button className="mt-7 w-full rounded-2xl bg-[#c55d32] px-6 py-4 font-semibold text-white shadow-lg shadow-[#c55d32]/20 transition hover:bg-[#af4d29] disabled:cursor-wait disabled:opacity-60" disabled={submitState.status === "submitting"} type="submit">
              {submitState.status === "submitting" ? "Saving request..." : "Create travel request"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
