import { auth, db } from '../config/firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// Helper to show error
function showError(message, elementId) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  } else {
    console.error(message);
    alert(message);
  }
}

// Helper: Assign random background ID
function assignBackgroundId() {
  return Math.floor(Math.random() * 41) + 1;
}

// Handle Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect to home or previous page
      window.location.href = '/index.html';
    } catch (error) {
      console.error("Login error:", error);
      let msg = "Login failed.";
      if (error.code === 'auth/invalid-credential') {
        msg = "Invalid email or password.";
      }
      showError(msg, 'login-error');
    }
  });
}

// Handle Register
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;

    if (password !== confirmPassword) {
      showError("Passwords do not match", 'signup-error');
      return;
    }

    if (username.length < 3) {
        showError("Username must be at least 3 characters", 'signup-error');
        return;
    }

    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update Profile (DisplayName)
      await updateProfile(user, {
        displayName: username
      });

      // 3. Create User Document in Firestore
      const userDoc = {
        username: username,
        email: email,
        createdAt: new Date().toISOString(),
        // gardenId: user.uid // Implicit 1:1 mapping
      };

      await setDoc(doc(db, "users", user.uid), userDoc);

      // 4. Create Garden Document in Firestore
      const backgroundId = assignBackgroundId();
      const gardenDoc = {
        ownerId: user.uid,
        ownerUsername: username, // Duplicate for easy access
        name: "Untitled Garden",
        backgroundId: backgroundId,
        plants: [],
        tempo: 80,
        ambientSound: null
      };

      await setDoc(doc(db, "gardens", user.uid), gardenDoc);

      // Redirect
      window.location.href = '/garden.html';
    } catch (error) {
      console.error("Registration error:", error);
      let msg = "Registration failed.";
      if (error.code === 'auth/email-already-in-use') {
        msg = "Email already in use.";
      } else if (error.code === 'auth/weak-password') {
        msg = "Password is too weak.";
      }
      showError(msg, 'signup-error');
    }
  });
}
