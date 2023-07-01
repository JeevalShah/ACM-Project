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

app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

const MONGOVALUE = process.env.MONGO_URI;

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
  USES: { type: String,}
});

//Creating a model
const URLModel = mongoose.model("URL", URLSchema);

app.post("/api", async function (req, res) {
  //Receiving URL from user
  const url = req.body.url;

  let uses;
  if(req.body.use){
    uses = req.body.use;
    uses = uses.trim();
    if(!(Number(uses))){
      res.end(main.replace("{{%%LINK / ERROR DEF}}", "Number of uses has to be a digit"));
    } 
  } else {
    uses = -1;
  }
  console.log(uses);

  //Checking if URL is valid
  if (!isvalidURL(url)) {
    //Sending response
    res.end(main.replace("{{%%LINK / ERROR DEF}}", "Invalid URL Input"));
    //Ends the running of the app.post function
    return;
  }

  //Declaring identifier
  let identifier;

  //A variable that will determine whether the model is saved
  let save = true;

  if (!req.body.domain) {
      //Loop runs continuously until it finds an identifier not already stored in DB
      while (true) {
        identifier = Math.random().toString(36).substring(2, 8);
        let identifierJSONformat = await URLModel.findOne({
          shorten: identifier,
        });
        //If identifier not in DB, break out of loop
        if (!identifierJSONformat) {
          break;
        }
      }
    }


  if(req.body.domain){
    identifier = req.body.domain;
      identifier = identifier.trim().replace(" ", "-");

      //Checks if the domain has already been used
      let identifierJSONformat = await URLModel.findOne({
        shorten: identifier,
      });

      //If the domain is alreasy used, then error page is sent
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
    shorten: identifier,
    USES: uses,
  });

  //Creating link
  const link = "https://acm-project.vercel.app/api/" + identifier;

  //If save is true, then the URLModel that was just created in URLstorage is saved to Database
  if (save) {
    URLstorage.save();
  }

  //Creating QR Code & sending it to frontend
  qrcode.toDataURL(link, (err, src) => {
    res.end(output.replace("{{LINK}}", link).replace("{{QR_IMAGE}}", src));
  });
});

app.get("/api/:id", async function (req, res) {
  //Gettting ID
  const id = req.params.id;

  //Checking if ID in Database
  const URLjson = await URLModel.findOne({ shorten: id });

  // Checking if the ID was found
  if (URLjson) {

    const url = URLjson["URL"];
    const identifier = URLjson["shorten"];
    const USESleft = URLjson["USES"];
    const IDbyMongo = URLjson["_id"];

    const tester = await URLModel.findByIdAndRemove({_id: IDbyMongo});

    if (USESleft != 0){

      const URLstorage = new URLModel({
        URL: url,
        shorten: identifier,
        USES: (USESleft-1),
      }); 

      URLstorage.save();

      //Redirecting to required website
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

//Gets the html File for the main page
app.get("/", function (req, res) {
  res.end(main.replace("{{%%LINK / ERROR DEF}}", ""));
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
