

async function main(){

// Import the 'express' library and assign it to the variable 'express'
// Set up express, HBS and wax-on
const express = require("express");
const hbs = require("hbs");
const wax = require("wax-on");

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { authenticateToken } = require('./middleware.js')


wax.on(hbs.handlebars);
wax.setLayoutPath("./views/layouts");

let app = express();


// Enable webforms
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "hbs"); // use handlebars for rendering pages
app.use(express.static("public")); // set route for static files
app.use(express.json()); // parse json objects

// Import the 'cors' library for handling Cross-Origin Resource Sharing
const cors = require("cors");

// Import and configure the 'dotenv' library for reading environment variables from a '.env' file
require("dotenv").config();

// Import the 'ObjectId' class from the 'mongodb' library
const ObjectId = require("mongodb").ObjectId;

// Import the 'MongoUtil' module from a local file ('./mongoUtil.js')
const mongoUtil = require("./mongoUtil.js");

// Retrieve the MongoDB connection URL from the environment variables using 'process.env'
const mongoUrl = process.env.MONGO_URL;


// Retrieve the hash key from the environment variables using 'process.env'
const jwtSecret = process.env.JWT_SECRET;




// Connect to Mongo
  let db = await mongoUtil.connect(process.env.MONGO_URL, 'playlog');

  let sessionList = await db.collection('session').find().toArray()
  let userList = await db.collection('users').find().toArray()
  let gamesList = await db.collection('games').find().toArray()
  let playerList = await db.collection('player').find().toArray()


  let testInstructions = `<pre>
  Routes for testing
  ------------------

   == HTTP Methods ==
  
  [GET] 
  \/                -  This page
  \/sessions        -  Session list 
  \/players         -  Players list 
  \/games           -  Games list
  \/allusers        -  Restricted route visible only after successful login and access using valid bearer token
  \/search          -  Search player list using https://&lturl&gt/search?searchterms=&ltPLAYER NAME&gt (Hint:Try 'Annie', 'Gail', 'Tony' or 'Gabe')
  
  [POST]
  \/register        -  Create new user with the following JSON format.  { "username": "yourusername" , "password": "yourpassword" }
  \/login           -  Login with credentials created in register. Copy token returned on successful login and test using \/allusers
  \/changepassword  -  Change password of current user using {"newPassword": "&ltyournewpassword&gt"} and valid bearer token

  [DELETE]
  \/delete          -   Delete user at https://&lturl&gt/delete/ID=&ltID TO DELETE&gt. See /allusers for list.

  `

  const router = express.Router();

  // Base Route
  app.get("/", function(req,res){
    res.send(testInstructions);
})

// Sessions Route
app.get("/sessions", function(req,res){
    res.send(sessionList);
})

// Games Route
app.get("/games", function(req,res){
  res.send(gamesList);
})

// Players Route
app.get("/players", function(req,res){
  res.send(playerList);
})

// Register New User
app.post('/register', async function(req, res){
 
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const newUser = {
      username: req.body.username,
      password: hashedPassword
  };
  const results = await db.collection("users").insertOne(newUser);
  res.json({
      results
  });


});

// Login New User
app.post('/login', async function (req, res)  {
  try {
    const user = await db.collection("users").findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restricted Route (Show Users)
app.get("/allusers", authenticateToken, async function(req, res){
  res.send(userList);
})

// Restricted Route (Change Password)
app.post("/changepassword", authenticateToken, async function(req, res){
  let currentUser = await db.collection('users').findOne({ _id: new ObjectId(req.user.userId) });
  let newPassword = await bcrypt.hash(req.body.newPassword, 10);

  await db.collection('users').updateOne(
    { _id: new ObjectId(req.user.userId) },
    { $set: { "password": newPassword } }
  );
  res.send(`Password changed for user '${currentUser.username}'.`);
  })

  app.delete("/delete/:id", async (req, res) => {
    let results = await db.collection("users").deleteOne({
      _id: new ObjectId(req.params.id)
    });
    res.status(200);
    res.send({
      message: "OK"
    });
  });


// Search
app.get("/search", async function(req,res){

    // Initialize an empty criteria object to be used as a filter in the database query.
    let searchterms = req.query.searchterms;

    // Check if the 'description' query parameter is provided in the request.
    // If present, add a case-insensitive regex filter to the 'criteria' object.

    const isearch = new RegExp(searchterms, 'i');
  

  // Use the 'db' object to query the "player" collection with the specified criteria.
  // Convert the results to an array using 'toArray()' and store them in the 'results' variable.
  let results = await db
    .collection("player")
    .find({ name: { $regex: isearch } })  // find takes an object
    .toArray();


  res.status(200);
  console.log(searchterms);
  res.send(results);


})

  app.listen(3000, () => console.log("Server started"));
}

main()
