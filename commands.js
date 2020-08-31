const DefaultPrefix = ";";

var commands = {};
var bot;

class Command {
  
  execute(args, msg) {
    this.action(bot, args, msg);
  };
  
  constructor(name, aliases, action) {
    
    // Check if the command already exists
    if (commands[name]) {
      throw "Command " + name + " already exists";
    };
  
    if (typeof(action) !== "function") {
      throw "Action is not a function";
    };
    
    // Create the command
    this.aliases = aliases;
    this.action = action;
    
    commands[name] = this;
    
  };
};

// Functions for other scripts to use
function listCommands() {
  return commands;
};

function getCommand(commandName) {
  if (!commandName) {
    throw "No command name provided";
  };
  
  var command = commands[commandName];
  
  // Find the command by alias
  if (!command) {
    
    for (var possibleCommand in commands) {
      if (commands.hasOwnProperty(possibleCommand)) {
        function findAlias(alias) {
          if (alias === commandName) {
            return alias;
          };
        };
        
        if (commands[possibleCommand].aliases.find(findAlias)) {
          var command = commands[possibleCommand];
          break;
        };
      };
    };
    
  };
  
  return command;
};

function registerBot(client) {
  bot = client;
};

function getPrefix(guildId) {
  return DefaultPrefix;
};

// Send the exports!
exports.registerBot = (client) => { registerBot(client); };
exports.get = (command) => { return getCommand(command); };
exports.list = listCommands();
exports.new = Command;
exports.getPrefix = getPrefix;