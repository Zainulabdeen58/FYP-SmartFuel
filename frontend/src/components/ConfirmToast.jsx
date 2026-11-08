import { useEffect } from "react";
import Icon from "./Icon";

// The question inside a confirmToast (toast.js). react-toastify adds `closeToast`; the
// answer closes the toast with "confirm" (the red button) or "cancel" (Cancel or Escape).
function ConfirmToast({ message, confirmLabel, closeToast }) {
  useEffect(() => {
    const cancelOnEscape = (event) => {
      if (event.key === "Escape") closeToast("cancel");
    };
    document.addEventListener("keydown", cancelOnEscape);
    return () => document.removeEventListener("keydown", cancelOnEscape);
  }, [closeToast]);

  return (
    <div className="confirm-toast">
      <p>{message}</p>

      <div className="confirm-toast-actions">
        {/* Focused, so Enter confirms like the browser's confirm() box did. */}
        <button type="button" className="delete-button" onClick={() => closeToast("confirm")} autoFocus>
          <Icon name="trash" size={15} />
          {confirmLabel}
        </button>
        <button type="button" className="secondary-button" onClick={() => closeToast("cancel")}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ConfirmToast;
