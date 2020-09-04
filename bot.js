const eris = require("eris");
const path = require("path");
const fs = require("fs");

const Bot = new eris(process.env.DISCORD_TOKEN);
const Commands = require("./commands");

// Load important files
const loadFolderNames = ["commands", "events"];

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
  
  // Check if they just want the bot prefix
  const AuthorPing = "<@" + msg.author.id + ">";
  if (msg.content === "<@" + Bot.user.id + ">" || msg.content === "<@!" + Bot.user.id + ">") {
    msg.channel.createMessage(AuthorPing + " My prefix is **`" + ServerPrefix + "`**!");
    return;
  };

  if (!msg.author.bot && msg.author.id !== bot.user.id && msg.content.substring(0, ServerPrefix.length) === ServerPrefix) {
    if (msg.content.indexOf(" ") != -1) {
      var commandName = msg.content.substring(1, msg.content.indexOf(" "));
      var args = msg.content.substring(msg.content.indexOf(" ")+1);
    } else {
      var commandName = msg.content.substring(1);
    };

    try {
      const Command = Commands.get(commandName);
      Command ? Command.execute(args, msg) : undefined;
    } catch (err) {
      msg.channel.createMessage({
        content: AuthorPing + " Something bad happened! Please try again.",
        embed: {
          description: "Please [submit this report to Makuwro](https://github.com/makuwro/toasty/issues) if this continues. \nThink you can help us fix this? [Shoot a pull request](https://github.com/makuwro/toasty/pulls) our way!",
          fields: [{
            name: "Error",
            value: err.name + ": " + err.message
          }, {
            name: "Stack",
            value: err.stack
          }]
        }
      })
    };
    
  };
  
});

Bot.connect();