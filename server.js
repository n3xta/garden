// library imports
const express = require("express"); // imports express
// const multer = require("multer");   // imports multer -- handles file upload
const bodyParser = require("body-parser");  // imports body parser -- allows us to have a body in server request
const nedb = require("@seald-io/nedb")
const cookieParser = require('cookie-parser'); // needed to parse cookies
const session = require('express-session'); // Import express-session

// instantiate express application
const app = express();

// more variable setups
const urlEncodedParser = bodyParser.urlencoded({ extended: true }); // set up body parser to parse request.body
// const upload = multer({ dest: "public/uploads" }); // set up multer location to store files

// database setup
let database = new nedb({ filename: "database.txt", autoload: true })

// middleware setup for express application
app.use(express.static("public"));  // set the default folder for any static files such as assets, css, html
app.use(urlEncodedParser);        // attach body parser to app to parse request.body
app.use(cookieParser());          // add cookie parser middleware
app.use(session({
    secret: 'your secret key', // Replace with a strong secret in production!
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));
app.set("view engine", "ejs"); // attach ejs as templating engine

// default route - home page showing recent gardens
app.get("/", (request, response) => {
  // Determine user state from session
  let user = null;
  if (request.session.userId && request.session.username) {
    user = { username: request.session.username }; // Use username from session
  }

  // Fetch recent garden data (This part seems unrelated to users, maybe for explore?) 
  // If it was meant to show user-specific gardens, it needs adjustment.
  // Keeping the existing query for now.
  let query = {}; 
  database.find(query).sort({ createdAt: -1 }).limit(6).exec((err, data) => {
    if (err) {
        console.error("Database error fetching data for homepage:", err);
        // Render page even if data fetch fails, but maybe show an error?
        return response.render('index.ejs', { posts: [], user: user, error: "Could not load recent gardens." });
    }
    // Pass user object (or null) based on session and the fetched data to the template
    response.render('index.ejs', { posts: data, user: user, error: null });
  });
});

// Login route
app.get("/login", (req, res) => {
  res.render('login.ejs');
});

// Handle user login
app.post("/authenticate", urlEncodedParser, (req, res) => {
  const { username, password } = req.body;
  
  // Basic validation
  if (!username || !password) {
    // Pass error message back to login page
    return res.render('login.ejs', { error: "Username and password are required" });
  }
  
  // Check user credentials
  database.findOne({ username: username, password: password }, (err, user) => {
    if (err) {
      console.error("Database error:", err);
      // Pass generic error message back
      return res.render('login.ejs', { error: "Server error during login" });
    }
    
    if (!user) {
      // Pass invalid credentials error message back
      return res.render('login.ejs', { error: "Invalid username or password" });
    }
    
    // Set session variable upon successful authentication
    req.session.userId = user._id; // Store user's NeDB ID in the session
    req.session.username = user.username; // Optionally store username for convenience
    
    // Redirect to user's garden page on success
    res.redirect("/mygarden");
  });
});

// Register route
app.get("/register", (req, res) => {
  // Pass error as null initially
  res.render('register.ejs', { error: null }); 
});

// Handle user registration
app.post("/register", urlEncodedParser, (req, res) => {
  // Extract registration data
  const { username, password, confirmpassword } = req.body;
  
  // Basic validation
  if (!username || !password || !confirmpassword) {
    return res.render('register.ejs', { error: "All fields are required" });
  }
  
  if (password !== confirmpassword) {
    return res.render('register.ejs', { error: "Passwords do not match" });
  }
  
  // Check if username already exists
  database.findOne({ username: username }, (err, existingUser) => {
    if (err) {
      console.error("Database error:", err);
      return res.render('register.ejs', { error: "Server error during registration" });
    }
    
    if (existingUser) {
      return res.render('register.ejs', { error: "Username already exists" });
    }
    
    // Create new user
    const newUser = {
      username,
      password, // NOTE: Hashing passwords is crucial for production
      createdAt: new Date().toLocaleString(),
      garden: { // Add default empty garden structure
        plants: [], 
        tempo: 80
      }
    };
    
    database.insert(newUser, (err, user) => {
      if (err) {
        console.error("Error creating user:", err);
        return res.render('register.ejs', { error: "Error creating user" });
      }
      
      // Automatically log the user in by setting session variables
      req.session.userId = user._id;
      req.session.username = user.username;

      // Redirect to user's garden page after successful registration and login
      res.redirect("/mygarden");
    });
  });
});

// User's personal garden page
app.get("/mygarden", (req, res) => {
  // Check if user is logged in via session
  if (!req.session.userId) {
    // If not logged in, redirect to login page
    return res.redirect("/login");
  }

  const userId = req.session.userId;
  
  // Find the user by their ID
  database.findOne({ _id: userId }, (err, user) => {
    if (err) {
      console.error("Database error finding user:", err);
      // Handle error appropriately, maybe render an error page or redirect
      return res.status(500).send("Server error finding user data.");
    }

    if (!user) {
      // This shouldn't happen if session ID is valid, but handle defensively
      console.error("User not found for session ID:", userId);
      req.session.destroy(); // Clear invalid session
      return res.redirect("/login");
    }

    // Check if the user has a garden object. If not, create and save a default one.
    if (!user.garden) {
      console.log(`User ${user.username} (${userId}) missing garden data. Creating default.`);
      const defaultGarden = { plants: [], tempo: 80 };
      
      database.update({ _id: userId }, { $set: { garden: defaultGarden } }, {}, (updateErr, numReplaced) => {
        if (updateErr) {
          console.error("Database error updating user with default garden:", updateErr);
          return res.status(500).send("Server error initializing garden.");
        }
        if (numReplaced === 0) {
          console.error("Failed to update user with default garden (user not found?):". userId);
          // Should ideally not happen if we found the user above
          return res.status(500).send("Server error initializing garden.");
        }
        // Render the garden page with the newly created default garden data
        res.render('garden.ejs', { 
          user: { username: req.session.username }, // Pass username from session
          gardenData: defaultGarden // Pass the default garden data
        });
      });
    } else {
      // User has garden data, render the garden page with it
      res.render('garden.ejs', { 
        user: { username: req.session.username }, // Pass username from session
        gardenData: user.garden // Pass the user's garden data
      });
    }
  });
});

// Logout route
app.get("/logout", (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Could not log out.");
    }
    // Clear the session cookie and any old auth cookies
    res.clearCookie('connect.sid'); // Default session cookie name
    res.clearCookie('loggedIn');    // Clear old cookie
    res.clearCookie('username');    // Clear old cookie
    res.redirect('/');
  });
});

app.get("/debug", (req, res) => {
  res.render('debug.ejs');
});

app.get("/index", (req, res) => {
  res.render('index.ejs');
});

/* // Create new garden route (REMOVED - Replaced by user-specific garden handling)
app.post("/saveGarden", (req, res) => {
  let gardenData = {
    owner: req.body.owner || "Anonymous",
    gardenName: req.body.gardenName || "Untitled Garden",
    createdAt: new Date().toLocaleString(),
    timestamp: new Date().getTime(),
    plants: [],
    tempo: 80
  };

  database.insert(gardenData, (err, newDoc) => {
    if (err) {
      console.error("Error creating garden:", err);
      return res.status(500).send("Error creating garden");
    }
    res.redirect("/garden/" + newDoc._id);
  });
});
*/

/* // Update existing garden route (REMOVED - Replaced by /api/savegarden)
app.post("/updateGarden/:id", (req, res) => {
  let gardenId = req.params.id;
  let plantsData;
  
  try {
    plantsData = JSON.parse(req.body.plants);
  } catch (e) {
    console.error("Error parsing plants data:", e);
    return res.status(400).send("Invalid plants data format");
  }
  
  let query = { _id: gardenId };
  let update = {
    $set: {
      plants: plantsData.plants,
      tempo: plantsData.tempo,
      lastModified: new Date().toLocaleString()
    }
  };
  
  database.update(query, update, {}, (err, numUpdated) => {
    if (err) {
      console.error("Error updating garden:", err);
      return res.status(500).send("Error updating garden");
    }
    
    if (numUpdated === 0) {
      return res.status(404).send("Garden not found");
    }
    
    res.redirect("/garden/" + gardenId);
  });
});
*/

/* // Show a specific garden (REMOVED - Viewing is now via /mygarden for logged-in user)
app.get('/garden/:id', (req, res) => {
  // look for specific item in database that has the url from the params
  let query = {
    _id: req.params.id // _id is the property we are searching for in the db
  }

  // searching for one specific garden based off the query search
  database.findOne(query, (err, data) => {
    if (err || !data) {
      console.error("Error finding garden:", err);
      return res.status(404).render('garden.ejs', {garden: null}); // Should render garden.ejs? Needs review
    }
    res.render('garden.ejs', {garden: data}); // Should render garden.ejs? Needs review
  });
});
*/

// API route to save garden data for the logged-in user
app.post("/api/savegarden", express.json(), (req, res) => { // Use express.json() for parsing JSON body
  // Check if user is logged in via session
  if (!req.session.userId) {
    return res.status(401).send("Unauthorized: Please log in.");
  }

  const userId = req.session.userId;
  const gardenData = req.body.gardenData; // Expecting data in { gardenData: { plants: [...], tempo: ... } }

  // Basic validation of garden data (can be expanded)
  if (!gardenData || typeof gardenData !== 'object') {
      return res.status(400).send("Invalid garden data format.");
  }
  // You might want to add more specific validation for plants array, tempo, etc.

  // Update the user's garden field in the database
  database.update({ _id: userId }, { $set: { garden: gardenData } }, {}, (err, numReplaced) => {
    if (err) {
      console.error("Database error updating garden:", err);
      return res.status(500).send("Server error saving garden.");
    }
    
    if (numReplaced === 0) {
      // This could happen if the user was deleted between login and save
      console.error("Failed to save garden, user not found:", userId);
      return res.status(404).send("User not found.");
    }
    
    console.log(`Garden saved for user ${userId}`);
    res.sendStatus(200); // Send OK status
  });
});

// Explore gardens page
app.get("/explore", (req, res) => {
  // getting the term from the form if provided
  let searchTerm = req.query.searchTerm;
  let query = {};

  if (searchTerm) {
    // Using regex to search in owner or gardenName fields
    query = {
      $or: [
        { owner: new RegExp(searchTerm, 'i') },
        { gardenName: new RegExp(searchTerm, 'i') }
      ]
    };
  }

  // find all gardens matching the query, sorted by creation date (newest first)
  database.find(query).sort({ timestamp: -1 }).exec((err, results) => {
    if (err) {
      console.error("Error exploring gardens:", err);
      return res.status(500).send("Error loading gardens");
    }
    res.render('explore.ejs', {gardens: results});
  });
});

app.listen(6001, () => {
  // you can access your dev code via one of two URLs you can copy into the browser
  // http://127.0.0.1:6001/
  // http://localhost:6001/
  console.log("server started on port 6001");
});
