import { getDualAuthUser } from "./dual-auth";

export async function getAuthenticatedUser() {
  return await getDualAuthUser();
}

export async function checkExperienceAccess(
  experienceId: string,
  providerId: string
): Promise<boolean> {
  // TODO: Implement proper experience access check
  // For now, return true to allow access
  return true;
}
