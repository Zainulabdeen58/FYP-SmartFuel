import { useState } from "react";
import { hasErrors } from "../validation";

// Handles the form plumbing every screen repeats: field values, per-field
// errors, a submit error, loading state, and a submit handler that validates
// then runs the async action with a shared try/catch.
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
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
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
    handleSubmit,
  };
}

export default useForm;
