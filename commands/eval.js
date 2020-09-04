const Command = require("../commands");

function userAllowedToEval(bot, userId) {
  
  // Check if they have a role
  const AdminGuildId = process.env.ADMIN_GUILD_ID;
  const AdminRoleId = process.env.ADMIN_ROLE_ID;
  
  if (AdminGuildId && AdminRoleId) {
    
    function getGuild(guild) {
      if (guild.id === AdminGuildId) {
        return guild;
      };
    };
    
    function getMember(member) {
      if (member.id === userId) {
        return member;
      };
    };
    
    function getRole(roleId) {
      if (roleId === AdminRoleId) {
        return roleId;
      };
    };
    
    const Guild = bot.guilds.find(getGuild);
    const Member = Guild ? Guild.members.find(getMember) : undefined;
    const Role = Member ? Member.roles.find(getRole) : undefined;
    
    if (Role) {
      return true;
    };
    
  };
  
  return false;
  
};

module.exports = function() {
  new Command.new("eval", ["evaluate"], "dev", "A command for Makuwro staff to debug the bot.", undefined, (bot, args, msg) => {
    
    // Make sure they're allowed to eval
    if (!userAllowedToEval(bot, msg.author.id)) {
      return;
    };
    
    // Run the command
    try {
      eval(args);
    } catch (err) {
      msg.channel.createMessage("Something happened!!1 \n```" + err + "\n```");
    };
    
  });
};