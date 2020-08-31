// Setup Discord bot
const bot = require("./bot")
const fs = require("fs");

// Stuff for express app
const express = require("express");
const app = express();

app.get("/", (request, response) => {
  console.log("[Ping] Ping received ("+new Date().getTime()+")");
  response.send("It works!")
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
}); 