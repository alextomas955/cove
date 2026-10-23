import { createContext, useContext } from "react";
import type { AuthContextValue } from "./AuthContext";

/**
 * The context AuthProvider publishes. It lives apart from AuthContext.tsx so a component that only reads it, such as
 * the filter dialog checking a criterion's permission, keeps working where tests replace that module.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

/** The auth context when an AuthProvider is mounted, else null. */
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
