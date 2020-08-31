const eris = require("eris");
const path = require("path");
const fs = require("fs");

const Bot = new eris(process.env.DISCORD_TOKEN);
const Commands = require("./commands");

// Load important files
const loadFolderNames = ["commands", "log-events"];

for (var i = 0; loadFolderNames.length > i; i++) {
  
  const FolderName = loadFolderNames[i];
  
  fs.readdirSync(path.join(__dirname, FolderName)).forEach(function(fileName) {
    const File = require("./" + FolderName + "/" + fileName);
    if (typeof(File) === "function") {
      File(Bot);
    }
  });
  
};

// Register bot
Commands.registerBot(Bot);

// Listen to commands
Bot.on("messageCreate", (msg) => {
  
  const ServerPrefix = Commands.getPrefix(msg.channel.id);
  
  if (msg.content.substring(0, ServerPrefix.length) === ServerPrefix) {
    if (msg.content.indexOf(" ") != -1) {
      var commandName = msg.content.substring(1, msg.content.indexOf(" "));
      var args = msg.content.substring(msg.content.indexOf(" ")+1);
    } else {
      var commandName = msg.content.substring(1);
    };

    try {
      const Command = Commands.get(commandName);
      
      Command.execute(args, msg);
    } catch (err) {
      console.log(err);
    };
    
  };
  
});

Bot.connect();