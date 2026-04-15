// Role/permission helpers placeholder.
export function canManageRoles(role: string) {
  return role === "ADMIN" || role === "BPI" || role === "KADIV";
}

export function isSuperAdmin(role: string) {
  return role === "ADMIN" || role === "BPI";
}

export function canViewResults(role: string) {
  return role === "ADMIN" || role === "BPI" || role === "KADIV";
}

export function isKadivPSDM(role: string, divisionName?: string | null) {
  return role === "KADIV" && typeof divisionName === "string" && divisionName.toLowerCase() === "psdm";
}
