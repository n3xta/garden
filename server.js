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

// default route
app.get("/", (request, response) => {
  let query = {} // return everything in the db
  database.find(query).exec( (err, data)=>{
    response.render('index.ejs', {posts: data})
  } )
});

// route that is attached to the upload form
// uses multer middleware to parse and store image data
// app.post("/upload", upload.single("theimage"), (req, res)=>{
//   let currentDate = new Date() // create date instance

//   // setup structure of data that is stored in the database
//   let data = {
//     text: req.body.text,
//     date: currentDate.toLocaleString(),
//     timestamp: currentDate.getTime(),
//     likes: 0
//   }

//   if(req.file){
//     data.image = "/uploads/" + req.file.filename
//   }

//   // ADD or INSERT the data to the database
//   database.insert(data, (err, newData)=>{
//     res.redirect("/") // once data has been added successfully (no error param), redirect back to / route
//   })
// })

app.post("/saveGarden", (req, res) => {
  let gardenData = {
    owner: req.body.owner,
    gardenName: req.body.gardenName,
    createdAt: new Date().toLocaleString(),
    plants: req.body.plants
  };

  database.insert(gardenData, (err, newDoc) => {
    res.redirect("/garden/" + newDoc._id);
  });
});

// dynamic route for every page
app.get('/garden/:id', (req, res)=>{
  // look for specific item in database that has the url from the params
  let query = {
    _id: req.params.id // _id is the property we are searching for in the db
  }

  // searching for one specific post based off the query search
  database.findOne(query, (err, data)=>{
    res.render('garden.ejs', {garden: data})
  })
})

// route that is attached to search form
app.get("/explore", (req, res) => {
  // getting the term from the form
  let searchTerm = req.query.searchTerm

  // using REGular EXPressions to search the text properties of the database
  let databaseSearch = {
    text: new RegExp(searchTerm)
  }

  // find all data objects that use the specific search term
  database.find(databaseSearch, (err, results)=>{
    res.render('explore.ejs', {gardens: results})
  })
})

app.post('/like', (req, res)=>{
  let postId = req.body.postId

  let query = {
    _id: postId
  }

  let update = {
    // nedb specific syntax to update a numerical value
    $inc: {likes: 1}
  }

  database.update(query, update, {}, (err, numUpdated)=>{
    res.redirect('/')
  })
})

app.listen(6001, () => {
  // you can access your dev code via one of two URLs you can copy into the browser
  // http://127.0.0.1:6001/
  // http://localhost:6001/
  console.log("server started on port 6001");
});
