// state/authState.js
// Reserved slot for signed-in-user state, kept in its own file so the
// existing PCB/measurement/AI state in state/appState.js is untouched.
// Nothing reads or writes this yet — ui/main.js does not import it. Once a
// real AuthProvider exists (see auth/authProvider.js), wire its
// onAuthChange() callback to setCurrentUser() here.

const authState = {
  currentUser: null, // AuthUser | null — see auth/authProvider.js for the shape
};

export function getCurrentUser() {
  return authState.currentUser;
}

export function setCurrentUser(user) {
  authState.currentUser = user;
}

export function isSignedIn() {
  return authState.currentUser !== null;
}
