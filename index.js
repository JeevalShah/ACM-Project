require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const isvalidURL = require("is-url");
const mongoose = require("mongoose");
const fs = require("fs");
const qrcode = require("qrcode");

// Basic Configuration
const port = process.env.PORT || 3000;

const html = fs.readFileSync(process.cwd() + "/views/error.html", "utf-8");
const main = fs.readFileSync(process.cwd() + "/views/main.html", "utf-8");
const output = fs.readFileSync(process.cwd() + "/views/output.html", "utf-8");

// Configuring web application with appropriate middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

const MONGOVALUE = process.env.MONGO_URI;

// Connecting with database
mongoose.connect(MONGOVALUE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
});

// Checking if connection occured
const connection = mongoose.connection;
connection.on("error", console.error.bind(console, "connection error:"));
connection.once("open", () => {
  console.log("MongoDB connection established succesfully");
});

// Creating a new Schema with two values
const URLSchema = new mongoose.Schema({
  URL: { type: String },
  Shorten: { type: String },
  Uses: { type: String },
  Date: { type: String },
  Time: { type: String },
});

// Creating a model
const URLModel = mongoose.model("URL", URLSchema);

app.post("/api", async function (req, res) {
  // Receiving URL from user
  const url = req.body.url;
  var date = req.body.date_valid;
  var time = req.body.time_valid;

  // Getting Date & Time of request
  // current_date_for_comparision & current_time & allow for comparision and checking
  const dateObject = new Date();

  const current_date = ("0" + dateObject.getDate()).slice(-2);
  const current_month = ("0" + (dateObject.getMonth() + 1)).slice(-2);
  const current_year = dateObject.getFullYear();

  const current_date_for_comparision =
    current_year + "-" + current_month + "-" + current_date;

  const current_hours = ("0" + dateObject.getHours()).slice(-2);
  const current_minutes = ("0" + dateObject.getMinutes()).slice(-2);

  const current_time = current_hours + ":" + current_minutes;

  // Checking if URL is valid
  if (!isvalidURL(url)) {
    // Sending response
    res.end(main.replace("{{%%LINK / ERROR DEF}}", "Invalid URL Input"));
    // Ends the running of the app.post function
    return;
  }

  // Checks if number of uses was provided in Request. 
  // If not, uses = -1
  // If uses is not a digit, or positive then error is displayed
  let uses;
  if (req.body.use) {
    uses = req.body.use;
    uses = uses.trim();
    if (!Number(uses)) {
      res.end(
        main.replace(
          "{{%%LINK / ERROR DEF}}",
          "Number of uses has to be a digit"
        )
      );
    } else if (Number(uses) <= 0) {
      res.end(
        main.replace(
          "{{%%LINK / ERROR DEF}}",
          "Number of uses has to be a positive integer"
        )
      );
    }
  } else {
    uses = -1;
  }

  // This if, else-if ladder deals with the various cases where either only date or time is given or both are not provided
  if (!time && !date) {
    time = "23:59";
    date = "2099-12-31";
  } else if (!time && date) {
    time = "23:59";
  } else if (!date && time) {
    date = current_date_for_comparision;
  }

  // Date provided must either be today or else occur sometime in the future
  // Time can be provided within the 24 Hour Format, however on if the date is the current date
  // Then, time must be greater than current time
  if (date < current_date_for_comparision) {
    res.end(
      main.replace(
        "{{%%LINK / ERROR DEF}}",
        "Date provided must be a future date"
      )
    );
    return;
  } else if (current_date_for_comparision == date && time < current_time) {
    res.end(
      main.replace("{{%%LINK / ERROR DEF}}", "Time provided must be in future")
    );
    return;
  }

  // Declaring identifier
  let identifier;

  if (!req.body.domain) {
    // Loop runs continuously until it finds an identifier not already stored in DB
    while (true) {
      identifier = Math.random().toString(36).substring(2, 8);
      let identifierJSONformat = await URLModel.findOne({
        Shorten: identifier,
      });
      // If identifier not in DB, break out of loop
      if (!identifierJSONformat) {
        break;
      }
    }
  } else {
    // If custom domain provided, the string is trimmed & spaces are replaced by dashes
    identifier = req.body.domain;
    identifier = identifier.trim().replace(" ", "-");

    // Checks if the domain has already been used
    let identifierJSONformat = await URLModel.findOne({
      Shorten: identifier,
    });

    // If the domain is alreasy used, then error page is sent
    if (identifierJSONformat) {
      res.end(
        main.replace(
          "{{%%LINK / ERROR DEF}}",
          "The requested domain has already been used"
        )
      );
      return;
    }
  }

  // Insert a new URL into a model with identifier
  const URLstorage = new URLModel({
    URL: url,
    Shorten: identifier,
    Uses: uses,
    Date: date,
    Time: time,
  });

  URLstorage.save();

  // Creating link
  const link = "https://acm-project.vercel.app/api/" + identifier;

  // Creating QR Code & sending it to frontend
  qrcode.toDataURL(link, (err, src) => {
    res.end(output.replace("{{LINK}}", link).replace("{{QR_IMAGE}}", src));
  });
});

app.get("/api/:id", async function (req, res) {
  // Gettting ID
  const id = req.params.id;

  // Date provided must either be today or else occur sometime in the future
  // Time can be provided within the 24 Hour Format, however on if the date is the current date
  // Then, time must be greater than current time
  const dateObject = new Date();

  const current_date = ("0" + dateObject.getDate()).slice(-2);
  const current_month = ("0" + (dateObject.getMonth() + 1)).slice(-2);
  const current_year = dateObject.getFullYear();

  const current_date_for_comparision =
    current_year + "-" + current_month + "-" + current_date;

  const current_hours = ("0" + dateObject.getHours()).slice(-2);
  const current_minutes = ("0" + dateObject.getMinutes()).slice(-2);

  const current_time = current_hours + ":" + current_minutes;

  // Checking if ID in Database
  const URLjson = await URLModel.findOne({ Shorten: id });

  // Checking if the ID was found
  // If found, it gets all details from URLjson & then deletes the entry using ID
  if (URLjson) {
    const url = URLjson["URL"];
    const identifier = URLjson["Shorten"];
    const USESleft = URLjson["Uses"];
    const IDbyMongo = URLjson["_id"];
    const date_of_expiration = URLjson["Date"];
    const time_of_expiration = URLjson["Time"];

    const tester = await URLModel.findByIdAndRemove({ _id: IDbyMongo });

    // If the date & time requirements for request are met, only then will we be redirected
    if (
      (date_of_expiration == current_date_for_comparision &&
        time_of_expiration >= current_time) ||
      date_of_expiration > current_date_for_comparision
    ) {
      
      // If Usesleft is 1, that means the current request will make it 0
      // We do not want to store entries that cannot be accessed anymore, so it is not saved
      if (USESleft != 1) {
        const URLstorage = new URLModel({
          URL: url,
          Shorten: identifier,
          Uses: USESleft - 1,
          Date: date_of_expiration,
          Time: time_of_expiration,
        });

        URLstorage.save();
      }

      // Redirecting to required website
      res.redirect(url);
      return;
    }
  }

  // ID was not found and providing response
  res.end(
    html
      .replace("{{%%ERROR / SHORTURL STATEMENT}}", "404 Error!!")
      .replace("{{%%LINK / ERROR DEF}}", "Short URL not found or expired")
      .replace(
        "{{%%CORRECTION}}",
        "Please check that the correct shortened URL was entered"
      )
  );
  return;
});

// Gets the html File for the main page
app.get("/", function (req, res) {
  res.end(main.replace("{{%%LINK / ERROR DEF}}", ""));
});

// Displays the current port
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
