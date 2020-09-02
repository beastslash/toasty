const sql = require("mssql");

const GuildCache = require("../guild-cache");
const Commands = require("../commands");

const sqlConfig = {
  user: process.env.SQL_DB_USER,
  password: process.env.SQL_DB_PASSWORD,
  server: process.env.SQL_DB_SERVER,
  database: process.env.SQL_DB
};

async function getGuildConfig(guildId) {
  
  // Look for data in cache
  var GuildConfig = GuildCache.get(guildId);
  
  if (GuildConfig) {
    return GuildConfig;
  };
  
  // Get data from server
  const Pool = await sql.connect(sqlConfig);
  var GuildConfig = await Pool.request()
                      .input("guildId", sql.VarChar, guildId)
                      .query("select * from GuildConfig where guildId = @guildId");
  
  if (!GuildConfig.recordset[0]) {
    var GuildConfig = await Pool.request()
      .input("guildId", sql.VarChar, guildId)
      .input("loggingEnabled", sql.Bit, 0)
      .query(`insert into GuildConfig (guildId, loggingEnabled) values (@guildId, @loggingEnabled);
              select * from GuildConfig where guildId = @guildId`);
  };
  Pool.close();
  
  // Update cache
  GuildCache.set(guildId, GuildConfig.recordset[0]);
  
  // Return fresh data
  return GuildConfig.recordset[0];
  
};

new Commands.new("logs", ["log"], async (bot, args, msg) => {
  
  // Check permissions
  if (!msg.member.permission.has("manageGuild")) {
    msg.channel.createMessage(AuthorPing + " You don't have permission to manage logs.");
    return;
  };
  
  const AuthorId = msg.author.id;
  const AuthorPing = "<@" + AuthorId + ">";
  const GuildId = msg.channel.guild.id;
  var guildConfig = await getGuildConfig(GuildId);
  
  function sendLogStatus() {
    const LogChannelsString = guildConfig.logChannelIds === "" ? "[]" : guildConfig.logChannelIds;
    const LogChannels = JSON.parse(LogChannelsString);
    var ValidChannels = [];
    var InvalidChannels = [];
    
    // Verify Toasty's access
    
    for (var i = 0; LogChannels.length > i; i++) {
      if (bot.getChannel(LogChannels[i])) {
        ValidChannels.push("<#" + LogChannels[i] + ">");
      } else {
        InvalidChannels.push(LogChannels[i]);
      };
    };
  
    ValidChannels[ValidChannels.length - 1] = (ValidChannels.length > 1 ? "and " : "") + ValidChannels[ValidChannels.length - 1];

    msg.channel.createMessage(
      AuthorPing + " Message logging is " + (
        guildConfig.loggingEnabled ? "**enabled**, " + (
          ValidChannels[0] ? "and logs are being broadcast to " + ValidChannels.join(", ") + "." : "however, the log broadcast channel doesn't exist."
        ) : "disabled."
      )
    );
  };
  
  // Check for arguments
  const ArgsMatch = (args || "").match(/toggle|disable|enable|set|status/);
  
  if (!ArgsMatch) {
    sendLogStatus();
    return;
  };
  
  switch (ArgsMatch[0]) {
    case "toggle":
    case "disable":
    case "enable":
      // Check if logs are enabled
      const LoggingEnabled = guildConfig.loggingEnabled;
      if (args !== "toggle" && ((LoggingEnabled && args === "enable") || (!LoggingEnabled && args === "disable"))) {
        msg.channel.createMessage(AuthorPing + " Already ahead of you! Logs are " + args + "d.");
        break;
      };
      
      // Enable logs
      var pool = await sql.connect(sqlConfig);
      await pool.request()
        .input("guildId", sql.VarChar, GuildId)
        .input("loggingEnabled", sql.Bit, args === "enable" || (args === "toggle" && !LoggingEnabled) ? 1 : 0)
        .query("update GuildConfig set loggingEnabled = @loggingEnabled where guildId = @guildId");
      await pool.close();
      
      // Update cache
      guildConfig.loggingEnabled = !LoggingEnabled;
      GuildCache.set(GuildId, guildConfig);

      // Set cooldown
      this.applyCooldown(AuthorId, 5000);
      
      // Success.
      msg.channel.createMessage(AuthorPing + " Logging systems " + (LoggingEnabled ? "offline" : "online") + ". 😎");
      break;
    
    case "set":
      
      const LocationRegex = /--(channel) (<#(\d+)>|\d+)/g;
      const LogChannelMatches = [...args.matchAll(LocationRegex)];
      
      // Verify that the channels exist
      var LogChannels = [];
      for (var i = 0; LogChannelMatches.length > i; i++) {
        
        const LogChannelId = LogChannelMatches[i][2].includes("#") ? LogChannelMatches[i][3] : LogChannelMatches[i][2];
        const LogChannel = bot.getChannel(LogChannelId);
        
        if (!LogChannel) {
          msg.channel.createMessage(AuthorPing + " " + LogChannelId + " isn't a valid channel ID, or I can't access that channel.");
          return;
        };
        
        // Add it to the list
        LogChannels.push(LogChannelId);
        
      };
      
      const LogChannelsString = JSON.stringify(LogChannels);
      
      // Update the log channels
      var pool = await sql.connect(sqlConfig);
      await pool.request()
        .input("guildId", sql.VarChar, GuildId)
        .input("logChannelIds", sql.VarChar, LogChannelsString)
        .query("update GuildConfig set logChannelIds = @logChannelIds where guildId = @guildId");
      await pool.close();
      
      // Update cache 
      guildConfig.logChannelIds = LogChannelsString;
      GuildCache.set(GuildId, guildConfig);
      
      // Set cooldown
      this.applyCooldown(AuthorId, 5000);
      
      // Tell the user
      for (var i = 0; LogChannels.length > i; i++) {
        LogChannels[i] = (LogChannels.length > 1 ? (i === 0 ? "" : ", " + (i + 1 === LogChannels.length ? "and " : "")) : "") + "<#" + LogChannels[i] + ">";
      };
      
      msg.channel.createMessage(AuthorPing + " I'll file this server's logs in " + LogChannels.join("") + "!");
      break;
      
    case "status":
      sendLogStatus();
      break;
      
    default:
      msg.channel.createMessage("Invalid");
      break;
  };
  
}, 3000);