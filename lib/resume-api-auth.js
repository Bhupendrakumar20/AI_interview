export function getResumeApiAuthorizationHeader() {
  const username = process.env.RESUME_API_USERNAME;
  const password = process.env.RESUME_API_PASSWORD;

  if (!username || !password) {
    throw new Error("Resume API credentials are not configured.");
  }

  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}
