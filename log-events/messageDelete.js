const sql = require("mssql");
const GuildCache = require("../guild-cache");

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

module.exports = function(bot) {
  bot.on("messageDelete", async (msg) => {
    
    const GuildConfig = await getGuildConfig(msg.channel.guild.id);
    const LogChannelsString = GuildConfig.logChannelIds === "" ? "[]" : GuildConfig.logChannelIds;
    const LogChannels = JSON.parse(LogChannelsString);
    
    for (var i = 0; LogChannels.length > i; i++) {
      
      const LogChannel = bot.getChannel(LogChannels[i]);
      
      // Check if we have access to the channel
      if (!LogChannel) {
        continue;
      };
      
      // Sort out the fields
      var author = msg.author ? {
            name: msg.author.username + "#" + msg.author.discriminator,
            icon_url: msg.author.avatarURL
          } : undefined;
      var fields = [{
        name: "Channel",
        value: "<#" + msg.channel.id + ">"
      }];
      
      if (msg.content) {
        fields.push({
          name: "Content",
          value: msg.content
        });
      };
      
      // Send the log
      LogChannel.createMessage({
        content: "A message sent by **" + (msg.author ? msg.author.username : "an unknown sender") + "** was deleted.",
        embed: {
          author: author, 
          color: 16715278,
          fields: fields,
          footer: {
            text: msg.id
          }
        }
      });
    };
    
  });
};