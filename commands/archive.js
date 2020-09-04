const sql = require("mssql");
const fetch = require("node-fetch");

const Command = require("../commands");
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

const ArchiveCommand = new Command.new("archive", ["archives"], "archive");
ArchiveCommand.setAction(async (bot, args, msg) => {

  const GuildId = msg.channel.guild.id;
  const AuthorId = msg.author.id;
  var guildConfig = await getGuildConfig(GuildId);

  if (args && args.toLowerCase().substring(0, 11) === "set --guild") {

    // Get archive guild ID
    const LocationRegex = /--(guild) (\d+)/gi;
    const ArchiveGuildMatch = [...args.matchAll(LocationRegex)];
    const ArchiveGuildId = ArchiveGuildMatch[0][2];
  
    if (!ArchiveGuildId) {
      msg.channel.createMessage({
        content: "<@" + msg.author.id + "> You didn't tell me a guild to send archives to!",
        embed: {
          description: "**Valid usage:**\narchive set --guild **guildId**"
        }
      });

      return;
    };
    
    // Check if guild exists
    function botIsInGuild(possibleGuild, actualGuildId) {
      if (possibleGuild.id === ArchiveGuildId) {
        return possibleGuild;
      };
    };
    
    if (!bot.guilds.find(botIsInGuild)) {
      msg.channel.createMessage({
        content: "<@" + AuthorId + "> Either guild " + ArchiveGuildId + " doesn't exist, or I just wasn't invited to the party. :("
      });

      return;
    };

    // Check if there's already a row for the archive
    const Pool = await sql.connect(sqlConfig);
    await Pool.request()
      .input("guildId", sql.VarChar, GuildId)
      .input("archiveGuildId", sql.VarChar, ArchiveGuildId)
      .query("update GuildConfig set archiveGuildId = @archiveGuildId where guildId = @guildId");
    await Pool.close();
    
    // Update cache
    guildConfig.archiveGuildId = ArchiveGuildId;
    GuildCache.set(GuildId, guildConfig);

    // Tell them we're finished
    msg.channel.createMessage("<@" + AuthorId + "> Updated default archive guild ID to `" + ArchiveGuildId + "`!");

    // Set the cooldown
    this.applyCooldown(AuthorId, 5000)
    
    return;

  };

  // Make sure the user is a server manager
  if (!msg.member.permission.has("manageGuild")) {
    return;
  };
  
  // Check if guild exists
  const ArchiveGuildId = guildConfig.archiveGuildId;
  function botIsInGuild(possibleGuild) {
    if (possibleGuild.id === ArchiveGuildId) {
      return possibleGuild;
    };
  };
  
  if (!bot.guilds.find(botIsInGuild)) {
    msg.channel.createMessage({
      content: "<@" + AuthorId + "> I don't have access to Guild " + ArchiveGuildId + "! Please invite me to the guild, or set a new guild ID."
    });

    return;
  };

  const ConvertToJSON = args ? args.includes("--json") : false;
  const SendToChannel = args ? !args.includes("--no-channel") : true;

  // Make sure we're archiving for a reason
  if (!SendToChannel && !ConvertToJSON) {
    msg.channel.createMessage("<@"+ AuthorId +"> You've used the `--no-channel` flag, but didn't use the `--json` flag.");
    return;
  };

  // Tell the user that this may take a long time
  await msg.channel.createMessage("<@"+ AuthorId +"> Getting **all** messages in this channel before this one I just sent. This may take a long time if there are a lot of messages. Please wait!");

  var lastMessageId = msg.id;
  var messages = [];
  var currentMessageList;

  async function refreshMessages() {
    currentMessageList = await msg.channel.getMessages(100, lastMessageId);
  }

  async function keepGoing() {
    await refreshMessages();

    if (currentMessageList[0]) {
      
      setTimeout(async function() {

        // Send signal that the bot is still active
        msg.channel.sendTyping();

        // Add messages to message pool
        messages = messages.concat(currentMessageList);

        // Mark old message
        lastMessageId = currentMessageList[currentMessageList.length - 1].id;

        // Keep searching
        keepGoing();

      }, 3000);

    } else {

      messages = messages.reverse();

      // Create archive channel
      const archiveChannel = SendToChannel ? await bot.createChannel(guildConfig.archiveGuildId, msg.channel.name, 0) : undefined;

      // Tell them we're almost finished
      await msg.channel.createMessage("<@"+msg.author.id+"> Almost finished! I just got all of this channel's messages. " + (SendToChannel ? "I'll be saving them in <#" + archiveChannel.id + ">" : "") + (SendToChannel && !ConvertToJSON ? "." : SendToChannel ? " and " : "I'll be ") + (ConvertToJSON ? "turning it into JSON now." : ""));

      if (SendToChannel) {
        var userIcons = {};
        async function getUserIconFromUser(user) {

          if (!userIcons[user.id]) {

            // Get user avatar URL
            const avatarResponse = await fetch(user.avatarURL),
                  avatarBuffer = await avatarResponse.buffer();

            const botMessage = await archiveChannel.createMessage(
              user.username + "#" + user.discriminator + "'s avatar: ", {
                file: avatarBuffer,
                name: "AVI_" + user.id + ".png"
              }
            );

            userIcons[user.id] = botMessage.attachments[0].url;

          };

          return userIcons[user.id];

        };

        // Create webhook in the channel
        const webhook = await archiveChannel.createWebhook({
          name: "Toasty's User Impersonator"
        }, "Fufilling an archive request");

        // Store pinned messages
        const pinnedMessages = await msg.channel.getPins();

        for (var i = 0; messages.length > i; i++) {

          // This might take a bit
          msg.channel.sendTyping();
        
          // Check if message has an attachment
          var file = [];
          if (messages[i].attachments.length > 0) {

            // Download the attachments
            for (var attachment = 0; messages[i].attachments.length > attachment; attachment++) {

              const attachmentResponse = await fetch(messages[i].attachments[attachment].url);
              file.push({
                file: await attachmentResponse.buffer(),
                name: messages[i].attachments[attachment].filename
              });

            };

          };

          // Send the message
          const webhookMessage = await bot.executeWebhook(webhook.id, webhook.token, {
            auth: true,
            content: messages[i].content,
            allowedMentions: {
                users: false
            },
            username: messages[i].author.username,
            avatarURL: await getUserIconFromUser(messages[i].author),
            wait: true,
            embeds: [
              {
                footer: {
                  text: "Message ID: " + messages[i].id + " • User ID: " + messages[i].author.id
                },
                timestamp: new Date(messages[i].timestamp)
              }
            ],
            file: file

          });

          // Check if message is pinned
          if (pinnedMessages.find((pinnedMessage) => {
            if (pinnedMessage.id === messages[i].id) {
              return pinnedMessage;
            };
          })) {
            await webhookMessage.pin();
          };

        };
        
        // Delete the webhook
        await bot.deleteWebhook(webhook.id, undefined, "Cleaning up archive webhook");
      };

      var jsonURL;
      if (ConvertToJSON) {

        // Send JSON to the server
        const JSONMessages = JSON.stringify(messages);

        try {
          const Response = await fetch("http://127.0.0.1:" + process.env.PORT + "/archives/" + msg.channel.guild.id + "/" + msg.channel.id, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSONMessages
          });
          const JSONResponse = await Response.json();
          var jsonURL = JSONResponse.url;
        } catch (err) {
          console.log(err)
        };

      };

      // Tell them we're finished!
      await msg.channel.createMessage("<@" + AuthorId + "> Finished! " + (SendToChannel ? "All of your messages can be found in <#" + archiveChannel.id + ">. " : "") + (ConvertToJSON && jsonURL ? "The JSON file can be found here: " + jsonURL : ConvertToJSON && !jsonURL ? "I had a problem turning the messages into a JSON file." : "."));
      
      // Set the cooldown
      ArchiveCommand.applyCooldown(AuthorId, 10000);

    };

  };

  keepGoing();

}, 3000);