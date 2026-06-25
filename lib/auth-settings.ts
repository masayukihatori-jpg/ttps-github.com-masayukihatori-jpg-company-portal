export async function getAuthSettings() {
  return {
    authRequired: process.env.AUTHENTICATION_REQUIRED !== "false",
  };
}

export function getAuthenticationRequired() {
  return process.env.AUTHENTICATION_REQUIRED !== "false";
}
