require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const isvalidURL = require("is-url");
const mongoose = require("mongoose");
const fs = require("fs");

const html = fs.readFileSync(process.cwd() + "/views/output.html", "utf-8");
const main = fs.readFileSync(process.cwd() + "/views/main.html", "utf-8");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

const MONGOVALUE = process.env.MONGO_URI;

app.use("/public", express.static(`${process.cwd()}/public`));

//Connecting with database
mongoose.connect(MONGOVALUE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
});

//Checking if connection occured
const connection = mongoose.connection;
connection.on("error", console.error.bind(console, "connection error:"));
connection.once("open", () => {
  console.log("MongoDB connection established succesfully");
});

//Creating a new Schema with two values
const URLSchema = new mongoose.Schema({
  URL: { type: String },
  shorten: { type: String },
});

//Creating a model
const URLModel = mongoose.model("URL", URLSchema);

app.post("/api/shorturl", async function (req, res) {
  //Receiving URL from user
  const url = req.body.url;

  //Checking if URL is valid
  if (!isvalidURL(url)) {
    //Sending response
    res.end(
      html
        .replace("{{%%ERROR / SHORTURL STATEMENT}}", "400 Error!!")
        .replace("{{%%LINK / ERROR DEF}}", "Invalid URL Input")
        .replace(
          "{{%%CORRECTION}}",
          "Go back & ensure that your URL is properly entered"
        )
    );
    //Ends the running of the app.post function
    return;
  }

  // Initialising identifier & checking if the user URL input is in database
  let identifier;
  let urlJSONformat = await URLModel.findOne({ URL: url });

  //A variable that will determine whether the model is saved
  let save = true;

  if (urlJSONformat) {
    //Providing the identifier stored in DB
    identifier = urlJSONformat["shorten"];

    //Since the URL is already in DB, no need to save again
    save = false;
  } else {
    //Loop runs continuously until it finds an identifier not already stored in DB
    while (true) {
      identifier = Math.random().toString(36).substring(2, 12);
      let identifierJSONformat = await URLModel.findOne({
        shorten: identifier,
      });
      //If identifier not in DB, break out of loop
      if (!identifierJSONformat) {
        break;
      }
    }
  }

  // Insert a new URL into a model with identifier
  const URLstorage = new URLModel({
    URL: url,
    shorten: identifier,
  });

  //Creating link
  const link = "https://acmweb9.jeevalshah.repl.co/api/shorturl/" + identifier;

  //Providin response by replacing text in html object
  res.end(
    html
      .replace("{{%%ERROR / SHORTURL STATEMENT}}", "The Shortened URL is")
      .replace("{{%%LINK / ERROR DEF}}", link)
      .replace("{{%%CORRECTION}}", "")
  );

  //If save is true, then the URLModel that was just created in URLstorage is saved to Database
  if (save) {
    URLstorage.save();
  }
});

app.get("/api/shorturl/:id", async function (req, res) {
  //Gettting ID
  const id = req.params.id;

  //Checking if ID in Database
  const URLjson = await URLModel.findOne({ shorten: id });

  // Checking if the ID was found
  if (URLjson) {
    const URL = URLjson["URL"];

    //Redirecting to required website
    res.redirect(URL);
  } else {
    // ID was not found and providing response
    res.end(
      html
        .replace("{{%%ERROR / SHORTURL STATEMENT}}", "404 Error!!")
        .replace("{{%%LINK / ERROR DEF}}", "Short URL not found")
        .replace(
          "{{%%CORRECTION}}",
          "Please check that the correct shortened URL is entered"
        )
    );
    return;
  }
});

//Gets the html File for the main page
app.get("/", function (req, res) {
  res.end(main);
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
