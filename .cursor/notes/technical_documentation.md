# Technical Documentation: Garden Project

## 1. Project Overview

This project is a web application, likely themed around creating and managing personal "gardens". It allows users to register, log in, view a personalized garden space, save their garden's state, and potentially explore gardens created by others.

## 2. Technology Stack

*   **Backend:** Node.js
*   **Framework:** Express.js (`express`)
*   **Database:** NeDB (`@seald-io/nedb`) - An embedded JavaScript database, storing data in the `database.txt` file.
*   **Templating Engine:** EJS (`ejs`) for server-side rendering of HTML pages.
*   **Middleware:**
    *   `body-parser`: For parsing incoming request bodies (JSON and URL-encoded).
    *   `cookie-parser`: For parsing cookies.
    *   `express-session`: For managing user sessions and authentication state.
    *   `express.static`: For serving static files.
*   **Frontend:** (Inferred from directory structure)
    *   HTML (rendered via EJS)
    *   CSS (located in `public/css`)
    *   JavaScript (located in `public/js`)
    *   Various assets (images, 3D models, samples, fonts) in `public/` subdirectories.

## 3. Project Structure

```
/
|-- .git/                 # Git repository data
|-- node_modules/         # Node.js dependencies
|-- public/               # Static assets (CSS, JS, images, etc.)
|   |-- css/
|   |-- js/
|   |-- 2dassets/
|   |-- 3dassets/
|   |-- samples/
|   |-- fonts/
|   |-- lib/
|   |-- notes/
|-- views/                # EJS templates for HTML pages
|   |-- index.ejs
|   |-- login.ejs
|   |-- register.ejs
|   |-- garden.ejs
|   |-- explore.ejs
|   |-- debug.ejs
|-- .gitignore            # Specifies intentionally untracked files for Git
|-- database.txt          # NeDB database file
|-- package-lock.json     # Exact dependency versions
|-- package.json          # Project metadata and dependencies
|-- server.js             # Main Express application file (routing, logic)

```

## 4. Core Functionality & Endpoints

The main application logic resides in `server.js`.

*   **Static Files:** Serves files from the `/public` directory.
*   **Templating:** Uses EJS engine to render files from the `/views` directory.
*   **Database:** Initializes and uses NeDB stored in `database.txt`.
*   **Sessions:** Uses `express-session` for user login persistence. Cookies are used to manage sessions.

**Key Routes:**

*   `GET /`: Home page. Renders `views/index.ejs`. Displays recent gardens (fetches from DB, limited to 6, sorted by creation). Shows user info if logged in.
*   `GET /login`: Renders the login page (`views/login.ejs`).
*   `POST /authenticate`: Handles user login. Checks credentials against the database. Sets session variables (`userId`, `username`) on success. Redirects to `/mygarden` or the originally requested URL.
*   `GET /register`: Renders the registration page (`views/register.ejs`).
*   `POST /register`: Handles user registration. Validates input, checks for existing usernames. Creates a new user document in the database with an empty garden structure (`{ plants: [], tempo: 80 }`). **Stores passwords in plaintext (Security Risk!)**. Automatically logs the user in and redirects to `/mygarden`.
*   `GET /mygarden`: Renders the user's personal garden page (`views/garden.ejs`). Requires login (redirects to `/login` if not authenticated). Fetches the user's garden data from the database. If no garden data exists for the user, it creates and saves a default structure.
*   `GET /logout`: Logs the user out by destroying the session and clearing cookies. Redirects to `/`.
*   `POST /api/garden`: API endpoint for manually saving the current state of the user's garden. Requires login. Expects JSON payload `{ plants: [...], tempo: ... }`. Updates the user's document in the database. Returns JSON response.
*   `GET /explore`: Renders the explore page (`views/explore.ejs`). Allows searching gardens (implementation details seem incomplete or based on older schema assumptions in `server.js`).
*   `GET /debug`: Renders a debug page (`views/debug.ejs`).

**Commented-out Code:** `server.js` contains commented-out routes related to older ways of saving/updating/viewing specific gardens by ID, suggesting a refactor towards user-centric garden management. `multer` is also commented out, indicating potential past or future file upload features.

### 4.1 Data Flow & Frontend Interaction

*   **Garden Page (`/mygarden` -> `views/garden.ejs`):**
    *   `server.js` fetches the logged-in user's `garden` data from the database.
    *   This `gardenData` object (containing `plants` and `tempo`) is serialized into a JSON string using `<%- JSON.stringify(...) %>` within the EJS template.
    *   The JSON string is embedded in a `data-garden` attribute of a hidden `<div>` (`#garden-data`).
    *   Client-side JavaScript (`public/js/garden.js`) reads this attribute and parses the JSON to get the initial garden state.
    *   `public/js/garden.js`, utilizing `Three.js` for 3D rendering and `Tone.js` for audio synthesis, handles:
        *   Initializing the 3D garden scene based on `gardenData.plants`.
        *   Setting up audio playback based on plant data and `gardenData.tempo`.
        *   User interactions like playing/pausing audio, changing tempo, adding/manipulating plants (which likely represent notes or sounds).
        *   Sending the updated garden state (plants array and tempo) as a JSON payload to the `POST /api/garden` endpoint when the user saves.
*   **Home Page (`/` -> `views/index.ejs`):**
    *   `server.js` fetches database documents (intended as recent gardens) and passes them as a `posts` variable to `index.ejs`.
    *   However, the current `index.ejs` template **does not use** this `posts` data. It primarily focuses on displaying user login status (welcome message or login/register links) and navigation links.
*   **Explore Page (`/explore` -> `views/explore.ejs`):**
    *   The `views/explore.ejs` template file is currently empty.

## 5. Database Schema (Inferred for Users Collection)

Based on `server.js` logic and `database.txt` contents, user documents likely follow this structure:

```json
{
  "_id": "<unique_nedb_id>",
  "username": "user's username",
  "password": "user's plaintext password", // SECURITY RISK!
  "createdAt": "timestamp string",
  "garden": {
    "plants": [
      {
        "track": Number, // Likely identifies a position/instrument/row
        "step": Number, // Likely identifies a time step in a sequence
        "plantModelIndex": Number, // Index referencing a specific 3D plant model
        "audioParams": {
          "filterFreq": Number, // Audio filter frequency
          "delayFeedback": Number // Audio delay feedback amount
        },
        "scale": {
          "x": Number, // Model scale X
          "y": Number, // Model scale Y
          "z": Number // Model scale Z
        }
        // Potentially other plant-specific properties
      }
      // ... more plant objects
    ],
    "tempo": Number // Represents tempo (e.g., BPM), likely for audio playback
  }
  // Potentially other fields like 'lastModified' based on commented code
}
```

## 6. Setup & Running

1.  **Prerequisites:** Node.js and npm installed.
2.  **Install Dependencies:** Run `npm install` in the project root directory.
3.  **Start Server:** Run `node server.js`.
4.  **Access:** Open `http://localhost:6001` in a web browser.

## 7. Potential Issues & Areas for Improvement

*   **Security:** Passwords are stored in plaintext. This is a critical security vulnerability and should be addressed immediately by implementing password hashing (e.g., using `bcrypt`).
*   **Database:** NeDB is simple but might not scale well for larger applications or concurrent access. Consider migrating to a more robust database (e.g., PostgreSQL, MongoDB) for production environments.
*   **Error Handling:** Error handling seems basic. More specific error messages and potentially logging could improve robustness.
*   **Code Structure:** As the application grows, consider organizing routes and database logic into separate modules/files for better maintainability.
*   **Frontend Logic:** The details of the frontend interaction (in `public/js`) are crucial for the user experience. The garden functionality heavily relies on `public/js/garden.js` interacting with `Three.js` and `Tone.js`.
*   **Explore Functionality:** The `/explore` route fetches data but the corresponding `explore.ejs` view is empty.
*   **Dependencies:** `multer` is installed but not used. Consider removing it if file uploads are not planned. 