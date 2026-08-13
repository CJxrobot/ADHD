// auth/authProvider.js
// Reserved boundary for a future backend-backed user verification system.
// Nothing in the app calls this yet — it's not imported by ui/main.js — so
// adding this file changes zero existing behavior. Same pattern as
// instrumentation/multimeterAdapter.js: define the contract now, implement
// it once a real backend exists.
//
// Every provider (a future RestAuthProvider hitting your own backend, or a
// third-party auth service) must implement:
//
//   interface AuthProvider {
//     signUp(email: string, password: string): Promise<AuthSession>
//     signIn(email: string, password: string): Promise<AuthSession>
//     signOut(): Promise<void>
//     getCurrentUser(): AuthUser | null
//     onAuthChange(cb: (user: AuthUser | null) => void): () => void   // returns an unsubscribe fn
//   }
//
//   AuthUser    = { userId: string, email: string, plan?: string }
//   AuthSession = { user: AuthUser, token: string }
//
// Credential handling rule (same class of issue as the Gemini API key —
// see the architecture doc's "move the API key server-side" step, except
// this one is non-negotiable): no provider implementation in this codebase
// may verify a password itself or store one in plain form. A real provider
// sends email/password straight to a backend endpoint over HTTPS and gets
// back a session token; hashing, salting, and the user record live only in
// the backend database, never in this frontend code.
//
// Suggested backend surface when you build it (mirrors the REST style the
// architecture doc already sketched for /projects, /pcb, etc.):
//   POST /auth/signup   { email, password }        -> { user, token }
//   POST /auth/signin   { email, password }        -> { user, token }
//   POST /auth/signout  (bearer token)              -> 204
//   GET  /auth/me        (bearer token)              -> { user }
export {};
