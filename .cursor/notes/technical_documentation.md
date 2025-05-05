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

## 6. Garden Background System

Each user in the application is assigned a random background ID (1-41) at registration time. This ID determines which background image is displayed in their garden view from the collection of background images stored in `/public/2dassets/garden_bg/`.

**Implementation Details:**
- Background ID assignment happens in `server.js` via the `assignBackgroundId()` function
- The ID is stored in the user's document in the database under the `backgroundId` field
- The frontend implementation is handled by `garden-background.js`, which:
  - Retrieves the background ID from the data attribute of the `#garden-data` element
  - Sets a CSS custom property `--garden-background` with the appropriate image URL
  - The image is applied as a background via a pseudo-element in the CSS

```javascript
// garden-background.js
function setGardenBackground() {
  const backgroundId = getGardenBackgroundId();
  document.documentElement.style.setProperty('--garden-background', 
    `url('/2dassets/garden_bg/${backgroundId}.jpg')`);
}
```

## 7. Read-Only Garden Viewing

Users can view other users' gardens in a read-only mode without the ability to modify them.

**Implementation Details:**
- Accessible via the `/view/:id` endpoint, where `:id` is the user ID of the garden owner
- Uses the same `garden.ejs` template as the editable garden but with a `isReadOnly` flag set to true
- In read-only mode:
  - The "Save" button is hidden
  - The "Plant a Random Note" button is hidden
  - A banner is displayed showing whose garden is being viewed
  - If the viewer is logged in, a link to return to their own garden is provided

## 8. Explore Page Functionality

The Explore page allows users to browse and view gardens created by other users.

**Implementation Details:**
- Accessible via the `/explore` endpoint, which renders `explore.ejs`
- Backend provides API endpoints that the frontend JavaScript uses to fetch garden data
- Gardens are displayed in a grid with thumbnails and metadata (username, plant count, etc.)
- Users can click on a garden to view it in read-only mode
- The page includes search functionality to find specific gardens or users
- Responsive layout adapts to different screen sizes

## 9. Frontend Technologies

### 9.1 Three.js (3D Rendering)

The application uses Three.js for 3D rendering of the garden environment:

- **Scene Setup**: Creates a 3D scene that represents the garden space
- **Camera Setup**: Uses a perspective camera that allows users to navigate the 3D space
- **Lighting**: Implements ambient and directional lighting to create a visually appealing environment
- **Model Loading**: Loads GLTF models for plants via GLTFLoader
- **Controls**: 
  - OrbitControls for camera navigation (zoom, pan, rotate)
  - DragControls for interactive plant positioning

### 9.2 Tone.js (Audio Synthesis)

Tone.js provides the audio capabilities of the application:

- **Synth Creation**: Creates synthesizers for each plant/note in the garden
- **Sequencing**: Uses Tone.Sequence to create looping patterns based on plant positions
- **Effects**: Applies audio effects such as filters and delay to shape the sound
- **Transport Control**: Manages the start/stop/tempo of the audio playback
- **Scheduling**: Precisely schedules notes based on the garden's temporal grid

## 10. Audio Parameters

Each plant in the garden has audio parameters that affect how it sounds:

- **filterFreq**: Frequency value (in Hz) for a lowpass filter applied to the plant's sound
  - Higher values (e.g., 800Hz) allow more high frequencies through, creating brighter sounds
  - Lower values (e.g., 200Hz) filter out high frequencies, creating darker, more muffled sounds
  
- **delayFeedback**: Amount of feedback in the delay effect (echo)
  - Values range from 0 to 1
  - Higher values (e.g., 0.7) create more pronounced echoes that repeat for longer
  - Lower values (e.g., 0.1) create subtle, quickly fading echoes
  - Default is typically 0.3, creating a moderate echo effect

These parameters can be adjusted when adding or editing plants, allowing for customization of the garden's soundscape.

## 11. Plant Model System

The application features at least 17 different plant models (indexed from 1-17) that users can place in their gardens. Each model:

- Has a unique 3D appearance loaded from GLTF files in the `/public/3dassets/` directory
- May be associated with different sound characteristics
- Can be scaled using the `scale` property (x, y, z dimensions)
- Is positioned on a grid where:
  - `track` represents the vertical position (row)
  - `step` represents the horizontal position (column/time step)

Plant models are categorized into approximately:
- Large plants (plantModelIndex: 1-10) - scaled larger by default (2.3x)
- Small plants/flowers (plantModelIndex: 11-17) - scaled smaller by default (1.5x)

The combination of plant types, positions, and audio parameters creates the unique visual and auditory experience of each garden.

## 12. API Endpoints

### 12.1 Garden Data API

- `POST /api/garden`: 
  - Purpose: Save the current state of a user's garden
  - Authentication: Requires login
  - Request body: `{ plants: [...], tempo: number }`
  - Response: JSON `{ message: string }`

- `GET /api/gardens`:
  - Purpose: Fetch all gardens (used by the Explore page)
  - Authentication: None required
  - Response: JSON array of garden metadata (id, username, plantsCount, etc.)

- `GET /api/gardens/:id`:
  - Purpose: Fetch a specific garden by user ID
  - Authentication: None required
  - Response: JSON with complete garden data including plants and tempo

### 12.2 Authentication API

- `POST /authenticate`:
  - Purpose: User login
  - Request body: `{ username: string, password: string }`
  - Response: Redirects to /mygarden or originally requested URL

- `POST /register`:
  - Purpose: User registration
  - Request body: `{ username: string, password: string, confirmpassword: string }`
  - Response: Redirects to /mygarden or renders register.ejs with error

## 13. User Interface Elements

The garden interface includes several interactive elements:

- **Play Button**: Toggles the audio playback on/off
  - When pressed, it starts the Tone.js transport, playing the garden's music
  - When already playing, it stops the audio

- **Tempo Slider**: Controls the speed of the musical loop
  - Range: 40-240 BPM (beats per minute)
  - Default value is set to the garden's saved tempo or 80 BPM if new
  - Changes take effect immediately during playback

- **Plant a Random Note Button**: (Only in editable mode)
  - Adds a new plant at a random position in the garden
  - Assigns random audio parameters and a random plant model
  - The new plant becomes part of the musical loop

- **Save Button**: (Only in editable mode)
  - Sends the current garden state to the server via the `/api/garden` endpoint
  - Shows a "Saved!" notification when successful

- **Navigation Controls**:
  - Back to Home: Returns to the homepage
  - Explore: Opens the Explore page to browse other gardens

## 14. Page Transition System

The application features a custom ink-based page transition effect that provides a smooth visual transition between different pages.

### 14.1 Implementation Overview

The transition system consists of two main components:

- **Page Preloader**: An overlay shown immediately when a page begins loading to prevent content flickering
- **Transition Layer**: An ink effect animation that transitions between pages using a sprite sheet animation

The system is implemented with the following files:
- `public/js/transition.js`: Core JavaScript that handles transition logic
- `public/css/transition.css`: Styling for transition elements and animations
- `public/img/ink.png`: Sprite sheet used for the ink animation (contains 25 frames)

### 14.2 Transition Flow

The page transition follows this general flow:

1. **Initial Page Load**:
   - A preloader overlay is immediately shown (highest z-index)
   - The transition layer is prepared for an "ink out" animation if coming from another page
   - Page content is initially hidden with CSS

2. **Exiting a Page (Ink In)**:
   - User clicks a link with `data-transition="true"` attribute
   - An audio effect plays based on the destination page
   - The transition layer becomes visible with the "opening" animation (ink spreading)
   - Once animation completes, navigation to the new URL occurs
   - A flag is set in sessionStorage to indicate the next page should start with "ink out"

3. **Entering a Page (Ink Out)**:
   - The preloader is still visible, preventing content flash
   - If sessionStorage indicates an incoming transition, the ink layer starts fully covering the screen
   - Once page content is loaded, the preloader fades out
   - The "closing" animation plays (ink receding)
   - Page content becomes visible

### 14.3 Technical Details

- **Session Persistence**: Uses `sessionStorage.setItem('pageIsEntering', 'true')` to communicate transition state between pages
- **Animation Implementation**: CSS animations with steps() function to create sprite sheet frame-by-frame animation
- **Garden Page Special Handling**: Garden pages use additional delays to accommodate 3D content loading
- **Responsive Design**: Calculates appropriate dimensions for the transition layer based on window size and sprite aspect ratio
- **Audio Integration**: Plays specific sound effects during transitions (`/samples/ui/explore.wav`, `/samples/ui/garden.wav`)

### 14.4 Transition CSS Techniques

- Black filtering of the ink sprite using `filter: brightness(0) contrast(1000%)`
- CSS animations for sequenced sprite sheet playback
- CSS class-based state management (visible, opening, closing)
- Strategic opacity transitions to prevent content flashing

### 14.5 Usage

To enable transitions on a link:
```html
<a href="/destination" data-transition="true">Link Text</a>
```

The transition system automatically handles the rest, providing a consistent visual effect when navigating between pages.