const fs = require("fs");
const sql = require("mssql");
const { v4: uuid } = require('uuid');

// Setup Discord bot
const bot = require("./bot");

// Stuff for SQL
const sqlConfig = {
  user: process.env.SQL_DB_USER,
  password: process.env.SQL_DB_PASSWORD,
  server: process.env.SQL_DB_SERVER,
  database: process.env.SQL_DB
};

// Stuff for express app
const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (request, response) => {
  console.log("[Ping] Ping received ("+new Date().getTime()+")");
  response.send("It works!");
});

app.get("/archives/:guild_id/:channel_id/:log_id", async (req, res) => {

  const GuildId = req.params.guild_id;
  const ChannelId = req.params.channel_id;
  const LogId = req.params.log_id;
  const FileName = "./archives/" + GuildId + "/" + ChannelId + "/" + LogId + ".json";

  if (!fs.existsSync(FileName)) {
    res.sendStatus(404);
    return;
  };

  const Archive = require(FileName);
  res.send(Archive);

});

app.post("/archives/:guild_id/:channel_id", async (req, res) => {
  const Archive = req.body;
  const GuildId = req.params.guild_id;
  const ChannelId = req.params.channel_id;

  // Create the directory if necessary
  !fs.existsSync("./archives/" + GuildId) ? fs.mkdirSync("./archives/" + GuildId) : undefined;
  !fs.existsSync("./archives/" + GuildId + "/" + ChannelId) ? fs.mkdirSync("./archives/" + GuildId + "/" + ChannelId) : undefined;

  // Make sure the file doesn't already exist
  var logId;
  var fileName;
  while (!logId) {
    var logId = uuid();
    var fileName = "./archives/" + GuildId + "/" + ChannelId + "/" + logId  + ".json";
    if (fs.existsSync(fileName)) {
      logId = undefined;
    };
  };

  // Create the file
  fs.writeFileSync(fileName,  JSON.stringify(Archive));

  // Return the saved location
  res.json({url: "https://toasty.azurewebsites.net/" + fileName.substring(2, fileName.length - 5)});

});


// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
}); 