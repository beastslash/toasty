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
  bot.on("messageUpdate", async (newMessage, oldMessage) => {
    
    // Make sure the message is different
    if (oldMessage && newMessage.content === oldMessage.content) {
      return;
    };
    
    const GuildConfig = await getGuildConfig(newMessage.channel.guild.id);
    const LogChannelsString = GuildConfig.logChannelIds === "" ? "[]" : GuildConfig.logChannelIds;;
    const LogChannels = JSON.parse(LogChannelsString);
    
    for (var i = 0; LogChannels.length > i; i++) {
      
      const LogChannel = bot.getChannel(LogChannels[i]);
      
      // Check if we have access to the channel
      if (!LogChannel) {
        continue;
      };
      
      // Check if we have the old message
      if (oldMessage) {
        
        LogChannel.createMessage({
          content: "**" + newMessage.author.username + "** edited their message.",
          embed: {
            author: {
              name: newMessage.author.username + "#" + newMessage.author.discriminator,
              icon_url: newMessage.author.avatarURL
            },
            color: 14994184,
            fields: [
              {
                name: "Old message",
                value: oldMessage.content
              }, {
                name: "New message",
                value: newMessage.content
              }, {
                name: "Channel",
                value: "<#" + newMessage.channel.id + ">"
              }
            ],
            footer: {
              text: newMessage.id
            }
          }
        });
        
      } else {
        
        LogChannel.createMessage({
          content: "**" + newMessage.author.username + "** edited their message, but Discord blocked me from getting the message before its inevitable destruction.",
          embed: {
            author: {
              name: newMessage.author.username + "#" + newMessage.author.discriminator,
              icon_url: newMessage.author.avatarURL
            }, 
            color: 14994184,
            fields: [
              {
                name: "New message",
                value: newMessage.content
              }, {
                name: "Channel",
                value: "<#" + newMessage.channel.id + ">"
              }
            ], footer: {
              text: newMessage.id
            }
          }
        });
        
      };
    };
  });
};