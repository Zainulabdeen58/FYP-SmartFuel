import { useState } from "react";
import { hasErrors } from "../validation";

// Shared form logic: values, field errors, loading, and a submit that validates first.
function useForm({
  initialValues,
  validate,
  onSubmit,
  errorMessage = "Something went wrong",
}) {
  const [form, setForm] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (name, value) => {
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setFieldErrors((prev) => {
      // Clear this field's error while typing.
      const nextErrors = { ...prev, [name]: "" };
      // Re-check errors shown on other fields; some depend on this one (tank limit on vehicle type).
      const shownFields = Object.keys(nextErrors).filter((field) => nextErrors[field]);
      if (validate && shownFields.length > 0) {
        const errors = validate(nextForm);
        for (const field of shownFields) nextErrors[field] = errors[field] || "";
      }
      return nextErrors;
    });
  };

  // On blur: show this field's error at once. Empty fields wait for submit.
  const validateField = (name) => {
    if (!validate || form[name] === "") return;
    const message = validate(form)[name];
    if (message) setFieldErrors((prev) => ({ ...prev, [name]: message }));
  };

  const runValidation = () => {
    if (!validate) return true;
    const errors = validate(form);
    setFieldErrors(errors);
    return !hasErrors(errors);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!runValidation()) return;

    setLoading(true);

    try {
      await onSubmit(form, { setForm, setFieldErrors, setError });
    } catch (err) {
      setError(err.response?.data?.message || errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    error,
    setError,
    loading,
    updateField,
    validateField,
    handleSubmit,
  };
}

export default useForm;
