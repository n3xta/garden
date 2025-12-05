import { auth } from '../config/firebase.js';
import { onAuthStateChanged, signOut } from "firebase/auth";

document.addEventListener('DOMContentLoaded', () => {
  const loggedInView = document.getElementById('logged-in-view');
  const loggedOutView = document.getElementById('logged-out-view');
  const authLinksLoggedOut = document.getElementById('auth-links-logged-out');
  const authLinksLoggedIn = document.getElementById('auth-links-logged-in');
  const myGardenLinkContainer = document.getElementById('my-garden-link-container');
  const userDisplayName = document.getElementById('user-display-name');
  const logoutLink = document.getElementById('logout-link');

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      if (loggedInView) loggedInView.style.display = 'flex'; // or block depending on css
      if (loggedOutView) loggedOutView.style.display = 'none';
      if (authLinksLoggedOut) authLinksLoggedOut.style.display = 'none';
      if (authLinksLoggedIn) authLinksLoggedIn.style.display = 'block'; // or whatever flex/etc
      if (myGardenLinkContainer) myGardenLinkContainer.style.display = 'block';
      
      if (userDisplayName) {
        userDisplayName.textContent = user.displayName || user.email;
      }
    } else {
      // User is signed out
      if (loggedInView) loggedInView.style.display = 'none';
      if (loggedOutView) loggedOutView.style.display = 'flex';
      if (authLinksLoggedOut) authLinksLoggedOut.style.display = 'flex'; // check css, .auth-bookmarks a is inline-block usually
      if (authLinksLoggedIn) authLinksLoggedIn.style.display = 'none';
      if (myGardenLinkContainer) myGardenLinkContainer.style.display = 'none';
    }
  });

  if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        window.location.reload();
      } catch (error) {
        console.error("Logout error:", error);
      }
    });
  }
});


