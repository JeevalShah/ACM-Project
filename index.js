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

const html = fs.readFileSync(
  process.cwd() + "/views/miscellaneous.html",
  "utf-8"
);
const main = fs.readFileSync(process.cwd() + "/views/main.html", "utf-8");
const output = fs.readFileSync(process.cwd() + "/views/output.html", "utf-8");
const use = fs.readFileSync(process.cwd() + "/views/use.html", "utf-8");

// Configuring web application with appropriate middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

process.env.TZ = "Asia/Kolkata";

// Function which returns current date & time in required format
function returntime() {
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
  const date_time_array = [current_date_for_comparision, current_time];
  return date_time_array;
}

const MONGOVALUE = process.env.MONGO_URI;

// Connecting with database
mongoose.connect(MONGOVALUE, {
  useCreateIndex: true,
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

  // Getting current date & time
  const [current_date_for_comparision, current_time] = returntime();

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
    if (!Number(uses) || Number(uses) <= 0) {
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
  } else if (current_date_for_comparision == date && time <= current_time) {
    res.end(
      main.replace(
        "{{%%LINK / ERROR DEF}}",
        "Time provided must occur in future"
      )
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
    identifier = identifier.trim().replace(" ", "-").replace("/", "-");

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

  // Getting current date & time
  const [current_date_for_comparision, current_time] = returntime();

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

// Gets the use request & provides the corresponding html object
app.get("/use", async function (req, res) {
  res.end(use.replace("{{%%LINK / ERROR DEF}}", ""));
});

app.post("/use", async function (req, res) {
  // Getting the link in post request & modifying it
  // If link is not as per shortened URL, error is given
  shorturl = req.body.shorturl;
  if (shorturl.startsWith("https://acm-project.vercel.app/api/")) {
    shorturl = shorturl.replace("https://acm-project.vercel.app/api/", "");

    // Checking if the identifier is stored in MongoDB
    const URLjson = await URLModel.findOne({ Shorten: shorturl });

    // If stored in MongoDb, then we check uses
    // Else displays an error
    if (URLjson) {
      let uses = URLjson["Uses"];
      let date = URLjson["Date"];
      let time = URLjson["Time"];

      // Getting current date & time
      const [current_date, current_time] = returntime();
      if (date > current_date || (date == current_date && time > current_time)) {
        // Uses are dealt with according to type
        if (uses < 0) {
          uses = -uses - 1;
          res.end(
            html
              .replace("{{%%ERROR / SHORTURL STATEMENT}}", "Used: ")
              .replace("{{%%LINK / ERROR DEF}}", uses + " times")
              .replace("{{%%CORRECTION}}", "")
          );
        } else if (uses > 0) {
          res.end(
            html
              .replace("{{%%ERROR / SHORTURL STATEMENT}}", "Uses Left:")
              .replace("{{%%LINK / ERROR DEF}}", uses)
              .replace("{{%%CORRECTION}}", "")
          );
        }
      } else {
        res.end(use.replace("{{%%LINK / ERROR DEF}}", "Short URL Expired"));
      }
        
    } else {
      res.end(use.replace("{{%%LINK / ERROR DEF}}", "Short URL not found"));
    }
  } else {
    res.end(use.replace("{{%%LINK / ERROR DEF}}", "Invalid Short URL entered"));
  }
});

// Gets the html File for the main page
app.get("/", function (req, res) {
  res.end(main.replace("{{%%LINK / ERROR DEF}}", ""));
});

app.get("/:id", function (req, res) {
  // To create a Page Not Found Error
  // api is not get but post
  // Only use is get, hence the condition
  const id = req.params.id;
  if (id != "use") {
    res.end(
      html
        .replace("{{%%ERROR / SHORTURL STATEMENT}}", "404 Error!")
        .replace("{{%%LINK / ERROR DEF}}", "Page Not Found")
        .replace(
          "{{%%CORRECTION}}",
          "Check the URL you have entered & try again!"
        )
    );
  }
});

// Creating a not found page, in case something is added by user after /use
app.get("/use/:id", function (req, res) {
  res.end(
    html
      .replace("{{%%ERROR / SHORTURL STATEMENT}}", "404 Error!")
      .replace("{{%%LINK / ERROR DEF}}", "Page Not Found")
      .replace(
        "{{%%CORRECTION}}",
        "Check the URL you have entered & try again!"
      )
  );
});

// Displays the current port
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
