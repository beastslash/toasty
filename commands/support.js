const Command = require("../commands");

module.exports = function() {
  new Command.new("support", ["invite", "contribute"], (bot, args, msg) => {
    msg.channel.createMessage("Need help with the bot or have any bugs to show me? \nJoin our server here and put your question in #toasty! https://discord.gg/GTnHuE6 ");
  });
};