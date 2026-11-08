import { createElement } from "react";
import { toast } from "react-toastify";
import ConfirmToast from "./components/ConfirmToast";

// Toasts with react-toastify (its <ToastContainer /> is in Layout). Pages call these two
// instead of the browser's alert() and confirm().

// The server's success message, e.g. "Budget removed"; hides after a few seconds.
export const showToast = (message) => toast.success(message);

let openQuestionId = null;
let questionCount = 0;

// Asks before something is removed. Resolves true for the confirm button and false for
// Cancel or Escape. Only one question at a time: a new one cancels the open one.
export function confirmToast(message, confirmLabel = "Delete") {
  if (openQuestionId) toast.dismiss(openQuestionId);
  const toastId = `question-${++questionCount}`;
  openQuestionId = toastId;

  // An element (<ConfirmToast />), not the function, so react-toastify renders it as a
  // component and adds closeToast to its props.
  return new Promise((resolve) => {
    toast(createElement(ConfirmToast, { message, confirmLabel }), {
      toastId,
      // Only its own buttons (or Escape) answer it.
      autoClose: false,
      closeButton: false,
      closeOnClick: false,
      draggable: false,
      onClose: (reason) => {
        if (openQuestionId === toastId) openQuestionId = null;
        resolve(reason === "confirm");
      },
    });
  });
}
