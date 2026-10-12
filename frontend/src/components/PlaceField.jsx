import { useState } from "react";
import usePlaceSearch from "../hooks/usePlaceSearch";
import { checkPlaceSearch } from "../validation";
import Icon from "./Icon";

// A trip's start or destination: search by name and pick from the list, or click
// the map after pressing "Map" (`isPicking`). A chosen place can be renamed.
function PlaceField({ id, label, place, error, isPicking, onChange, onPickOnMap }) {
  const [text, setText] = useState("");
  const [textError, setTextError] = useState("");
  const { places, error: searchError, searching, search, clear } = usePlaceSearch();

  const runSearch = () => {
    const problem = checkPlaceSearch(text);
    setTextError(problem);
    if (!problem) search(text.trim());
  };

  const choose = (chosen) => {
    onChange(chosen);
    clear();
    setText("");
  };

  if (place) {
    return (
      <div className="field place-field">
        <label htmlFor={id}>{label}</label>

        <div className="place-row">
          <input id={id} value={place.name} onChange={(e) => onChange({ ...place, name: e.target.value })} />

          <button type="button" className="secondary-button" onClick={() => onChange(null)}>
            Change
          </button>
        </div>

        {error && <span className="field-error">{error}</span>}
      </div>
    );
  }

  return (
    <div className="field place-field">
      <label htmlFor={id}>{label}</label>

      <div className="place-row">
        <input
          id={id}
          type="text"
          value={text}
          placeholder="e.g. Liberty Market Lahore"
          onChange={(e) => setText(e.target.value)}
          // Enter searches instead of submitting the trip form.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
        />

        <button type="button" className="secondary-button" onClick={runSearch} disabled={searching}>
          <Icon name="search" size={15} />
          {searching ? "Searching..." : "Search"}
        </button>

        <button
          type="button"
          className={`secondary-button${isPicking ? " active" : ""}`}
          onClick={onPickOnMap}
          title={`Click the map to set the ${label.toLowerCase()}`}
        >
          <Icon name="pin" size={15} />
          Map
        </button>
      </div>

      {isPicking && <span className="field-hint">Click the map to set the {label.toLowerCase()}.</span>}

      {places?.length > 0 && (
        <ul className="place-results">
          {places.map((result) => (
            <li key={`${result.lat},${result.lng}`}>
              <button type="button" onClick={() => choose(result)}>
                <Icon name="pin" size={14} />
                {result.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {places?.length === 0 && (
        <span className="field-hint">No places found. Try a nearby city, or click the map.</span>
      )}

      {(textError || searchError || error) && (
        <span className="field-error">{textError || searchError || error}</span>
      )}
    </div>
  );
}

export default PlaceField;
