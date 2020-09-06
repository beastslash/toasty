const Command = require("../commands");

module.exports = function() {
  new Command.new("support", ["invite", "contribute"], "about", "Learn where you can report bugs or get help with the bot.", [], (bot, args, msg) => {
    msg.channel.createMessage("Need help with the bot or spot any bugs? \nJoin our support server; we'll give you some hugs! https://discord.gg/sUU7dfd ");
  }, 3000);
};