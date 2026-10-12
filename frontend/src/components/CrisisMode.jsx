import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { TRIP_PRIORITY_LABELS } from "../constant";
import {
  formatDay,
  formatDistance,
  formatLitres,
  formatMonthLabel,
  formatPlaceName,
  formatRupees,
  formatTripPlaces,
  formatVehicleLabel,
} from "../format";
import useCrisisAdvice from "../hooks/useCrisisAdvice";
import Icon from "./Icon";

// What crisis mode looks for; shown while it is off.
const WHAT_IT_CHECKS = [
  "Trips on the same day that start and end close together: make one trip instead of several.",
  "Trips marked “Can wait”: postpone them until fuel is easier to get.",
  "Trips not on the route that uses the least fuel: switch to the recommended route.",
  "This month's planned trips costing more than what is left of your budget.",
];

// General ways to save fuel, shown with or without trips.
const FUEL_SAVING_TIPS = [
  "Keep the tyres at the right pressure; soft tyres use more fuel.",
  "Drive smoothly and keep to 80–90 km/h on highways; speeding and hard braking waste fuel.",
  "Switch off the engine when you wait for more than a minute.",
  "Take out heavy things you don't need, and remove empty roof racks.",
  "Share rides, or use public transport for trips that allow it.",
  "Get the engine and air filter serviced on time.",
];

// Title, explanation and what "Accept" does, for each kind of suggestion.
function describeSuggestion({ type, trips, routeLabel }) {
  const [firstTrip, ...otherTrips] = trips;
  const tripText = `${formatTripPlaces(firstTrip)} on ${formatDay(firstTrip.date)}`;

  if (type === "combine") {
    const otherStops = otherTrips.map((trip) => formatPlaceName(trip.destination)).join(", ");
    return {
      title: `Combine ${trips.length} trips on ${formatDay(firstTrip.date)}`,
      text: `These trips start close together and end close together. Make one trip: ${formatTripPlaces(firstTrip)}, then go on to ${otherStops}.`,
      effect: "Accept marks the other trips as Combined; “Plan again” on the Trips page undoes it.",
    };
  }
  if (type === "postpone") {
    return {
      title: "Postpone a trip that can wait",
      text: `${tripText} is marked “Can wait”. Postpone it until fuel is easier to get.`,
      effect: "Accept marks the trip as Postponed; “Plan again” on the Trips page undoes it.",
    };
  }
  return {
    title: "Take the recommended route",
    text: `For ${tripText}, the “${routeLabel}” route is shorter than the route you chose.`,
    effect: "Accept switches the trip to that route; you can still choose another one on the Trips page.",
  };
}

// Estimates are shown in whole rupees.
const formatEstimatedRupees = (amount) => formatRupees(Math.round(amount));

// "6.3 km less driving · 0.53 L · Rs 158". Electric vehicles save no fuel or money.
function formatSaving({ km, litres, cost }) {
  const parts = [`${formatDistance(km)} less driving`];
  if (litres > 0) parts.push(formatLitres(litres));
  if (cost > 0) parts.push(formatEstimatedRupees(cost));
  return parts.join(" · ");
}

function SuggestionCard({ suggestion, busy, onAccept, onIgnore }) {
  const { title, text, effect } = describeSuggestion(suggestion);

  return (
    <div className="chart-card suggestion-card">
      <div className="suggestion-head">
        <h3>{title}</h3>
        <span className="suggestion-saving">Saves about {formatSaving(suggestion.saving)}</span>
      </div>

      <p className="suggestion-text">{text}</p>

      <ul className="suggestion-trips">
        {suggestion.trips.map((trip) => (
          <li key={trip._id}>
            <strong>{formatTripPlaces(trip)}</strong>
            <span>{formatDay(trip.date)}</span>
            {trip.vehicle && <span>{formatVehicleLabel(trip.vehicle)}</span>}
            <span className={`vehicle-badge${trip.priority === "essential" ? "" : " muted"}`}>
              {TRIP_PRIORITY_LABELS[trip.priority]}
            </span>
          </li>
        ))}
      </ul>

      <p className="chart-note">{effect}</p>

      <div className="suggestion-actions">
        <button type="button" className="submit-button small" onClick={onAccept} disabled={busy}>
          <Icon name="check" size={16} />
          Accept
        </button>
        <button type="button" className="secondary-button" onClick={onIgnore} disabled={busy}>
          Ignore
        </button>
      </div>
    </div>
  );
}

// This month's planned trips against what is left of the month's overall budget.
// A card with a title and a bulleted list.
function ListCard({ title, items }) {
  return (
    <div className="chart-card crisis-block">
      <div className="chart-card-header">
        <h3>{title}</h3>
      </div>
      <ul className="tips-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function BudgetCheck({ budget }) {
  if (!budget) {
    return <p className="chart-note crisis-block">Set this month's budget on the dashboard to compare it with your planned trips.</p>;
  }

  const monthBudget = `the ${formatMonthLabel(budget.month)} budget`;
  if (!budget.isShort) {
    return (
      <p className="chart-note crisis-block">
        This month's planned trips need about {formatEstimatedRupees(budget.plannedCost)}, within the{" "}
        {formatRupees(budget.remaining)} left of {monthBudget}.
      </p>
    );
  }

  const left = budget.remaining > 0 ? `only ${formatRupees(budget.remaining)} is left of` : "nothing is left of";
  return (
    <div className="budget-alert over crisis-block" role="status">
      This month's planned trips need about {formatEstimatedRupees(budget.plannedCost)}, but {left} {monthBudget}.
    </div>
  );
}

// Crisis mode page (FR-07): the on/off switch, suggestions for the planned trips and fuel tips.
// Suggestions only advise; accepting one changes the trip's status, never deletes it.
function CrisisMode({ user, saveUser }) {
  const isOn = Boolean(user.crisisMode);
  const { data: advice, error, loading, reload } = useCrisisAdvice(isOn);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  // What is being saved ("mode", "ignored" or a suggestion id), to disable its buttons.
  const [busy, setBusy] = useState("");

  // Sends one request; returns its answer, or null after showing the error.
  const run = async (busyKey, request) => {
    setBusy(busyKey);
    setMessage("");
    setActionError("");
    try {
      const { data } = await request();
      return data;
    } catch (err) {
      setActionError(err.response?.data?.message || "Something went wrong");
      return null;
    } finally {
      setBusy("");
    }
  };

  // The switch itself shows the new state, so no message. The suggestions load by themselves
  // once the saved user has crisis mode on.
  const toggleMode = async () => {
    const data = await run("mode", () => api.put("/crisis/mode", { enabled: !isOn }));
    if (data) saveUser(data.user);
  };

  // Reloads even after an error, because the suggestion may no longer exist.
  const respond = async (suggestion, action) => {
    const data = await run(suggestion.id, () =>
      api.post(`/crisis/suggestions/${encodeURIComponent(suggestion.id)}/${action}`),
    );
    if (data) setMessage(data.message);
    reload();
  };

  const showIgnored = async () => {
    const data = await run("ignored", () => api.delete("/crisis/ignored"));
    if (data) setMessage(data.message);
    reload();
  };

  const suggestions = advice?.suggestions ?? [];

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow">FUEL SHORTAGE</span>
          <h1>Crisis mode</h1>
          <p>
            When fuel is short, crisis mode checks your planned trips and suggests how to use less fuel, so the
            important trips can still be made.
          </p>
        </div>
      </div>

      <div className={`chart-card crisis-switch${isOn ? " on" : ""}`}>
        <div>
          <h3>{isOn ? "Crisis mode is on" : "Crisis mode is off"}</h3>
          <p>
            {isOn
              ? "Suggestions cover your planned trips from today on. Turning it off hides them; your trips stay as they are."
              : "Turn it on during a fuel shortage to get suggestions for your planned trips."}
          </p>
        </div>

        <button
          type="button"
          className={isOn ? "secondary-button" : "submit-button small"}
          onClick={toggleMode}
          disabled={busy === "mode"}
          aria-pressed={isOn}
        >
          <Icon name={isOn ? "close" : "alert"} size={16} />
          {isOn ? "Turn off" : "Turn on crisis mode"}
        </button>
      </div>

      {message && <div className="success-message crisis-block">{message}</div>}
      {(actionError || error) && <div className="form-error page-error">{actionError || error}</div>}

      {!isOn && <ListCard title="What crisis mode checks" items={WHAT_IT_CHECKS} />}

      {isOn && loading && !advice && (
        <div className="empty-state">
          <p>Checking your planned trips...</p>
        </div>
      )}

      {isOn && advice && (
        <>
          <div className="vehicle-summary">
            <div>
              <span>Planned trips</span>
              <strong>{advice.plannedTrips}</strong>
            </div>

            <div className="summary-divider" />

            <div>
              <span>Suggestions</span>
              <strong>{suggestions.length}</strong>
            </div>

            <div className="summary-divider" />

            <div>
              <span>Fuel you can save</span>
              <strong>{formatLitres(advice.totalSaving.litres)}</strong>
            </div>

            <div className="summary-divider" />

            <div>
              <span>Money you can save</span>
              <strong>{formatEstimatedRupees(advice.totalSaving.cost)}</strong>
            </div>
          </div>

          <BudgetCheck budget={advice.budget} />

          {suggestions.length > 0 && (
            <p className="chart-note crisis-block">
              Savings are estimates from each trip's route, mileage and fuel price.
            </p>
          )}

          <div className="suggestion-list">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                busy={busy === suggestion.id}
                onAccept={() => respond(suggestion, "accept")}
                onIgnore={() => respond(suggestion, "ignore")}
              />
            ))}
          </div>

          {advice.plannedTrips === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <Icon name="route" size={28} />
              </div>
              <h3>No planned trips</h3>
              <p>Crisis mode checks trips planned from today on. Plan a trip, or use the tips below.</p>
              <Link className="submit-button small" to="/trips">
                <Icon name="route" size={17} />
                Plan a trip
              </Link>
            </div>
          )}

          {advice.plannedTrips > 0 && !suggestions.length && (
            <div className="empty-state">
              <div className="empty-icon">
                <Icon name="route" size={28} />
              </div>
              <h3>No suggestions</h3>
              <p>Your planned trips already look fuel-efficient.</p>
            </div>
          )}

          {advice.hasIgnoredSuggestions && (
            <button type="button" className="secondary-button crisis-block" onClick={showIgnored} disabled={busy === "ignored"}>
              <Icon name="refresh" size={16} />
              Show ignored suggestions again
            </button>
          )}
        </>
      )}

      <ListCard title="Everyday ways to save fuel" items={FUEL_SAVING_TIPS} />
    </section>
  );
}

export default CrisisMode;
