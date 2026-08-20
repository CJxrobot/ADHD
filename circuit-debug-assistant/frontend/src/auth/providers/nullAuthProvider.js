// auth/providers/nullAuthProvider.js
// Stub implementation of AuthProvider (see ../authProvider.js). Always
// reports "no user, not implemented yet" — a placeholder so code can be
// written against the real interface shape today. Swap for a real provider
// (e.g. a RestAuthProvider calling your backend's /auth endpoints) later
// without changing anything that depends on the AuthProvider contract.
//
// Not imported anywhere in the app yet — reserved only.

export class NullAuthProvider {
  async signUp(_email, _password) {
    throw new Error('AUTH_NOT_IMPLEMENTED');
  }

  async signIn(_email, _password) {
    throw new Error('AUTH_NOT_IMPLEMENTED');
  }

  async signOut() {
    /* no-op — no session to clear */
  }

  getCurrentUser() {
    return null;
  }

  /** Returns an unsubscribe function, per the AuthProvider contract. */
  onAuthChange(_cb) {
    return () => {};
  }
}
