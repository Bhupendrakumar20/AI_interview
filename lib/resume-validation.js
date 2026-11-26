export async function validateResumeUpload(file) {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await fetch("/api/resume/validate", {
    method: "POST",
    body: formData,
  });

  let result;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.details || result?.detail || result?.error || "Failed to validate resume."
    );
  }

  if (!result?.valid) {
    throw new Error(
      result?.message || "Resume must include at least one entry under Education, Skills, and Projects."
    );
  }

  return result;
}
