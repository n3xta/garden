// library imports
const express = require("express"); // imports express
// const multer = require("multer");   // imports multer -- handles file upload
const bodyParser = require("body-parser");  // imports body parser -- allows us to have a body in server request
const nedb = require("@seald-io/nedb")

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
app.set("view engine", "ejs"); // attach ejs as templating engine

// default route - home page showing recent gardens
app.get("/", (request, response) => {
  let query = {} // return everything in the db
  database.find(query).sort({ createdAt: -1 }).limit(6).exec((err, data) => {
    response.render('index.ejs', {posts: data})
  });
});

// Login route
app.get("/login", (req, res) => {
  res.render('login.ejs');
});

// Register route
app.get("/register", (req, res) => {
  res.render('register.ejs');
});

// Create new garden route
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

// Update existing garden route
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

// Show a specific garden
app.get('/garden/:id', (req, res) => {
  // look for specific item in database that has the url from the params
  let query = {
    _id: req.params.id // _id is the property we are searching for in the db
  }

  // searching for one specific garden based off the query search
  database.findOne(query, (err, data) => {
    if (err || !data) {
      console.error("Error finding garden:", err);
      return res.status(404).render('garden.ejs', {garden: null});
    }
    res.render('garden.ejs', {garden: data});
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
