// Import config files
const permissions = require("../config/permissions");
const api = require("../config/api");
const db = require("./api/database");

// Import modules 
const fetch = require("node-fetch");
const fs = require("fs");

const commands = {};

class Command {
  constructor(name,aliases,description,cooldown,category,usage,permissions,operation,disabled) {
    // Spaces in commands may conflict with their arguments
    if (name.indexOf(" ") !== -1) {
      console.log("Can't create \""+name+"\" because spaces aren't allowed in command names.");
      return;
    };
    
    if (aliases && aliases[0]) {
      for (var i=0; i < aliases.length; i++) {
        if (aliases[i].indexOf(" ") !== -1) {
          console.log("Can't create \""+name+"\" because spaces aren't allowed in aliases.");
          return;
        };
      };
    };
    
    // Multiple commands with the same name can't exist
    if (commands[name]) {
      console.log("Can't create command "+name+" because it already exists.");
      return;
    };
    
    // Check if category exists
    if (category) {
      
    } else {
      category = "all";
    };
    
    // Set information about the command
    this.name = name.toLowerCase();
    this.aliases = aliases || [];
    this.descripion = description || "No description provided";
    this.cooldown = cooldown || 0;
    this.cooled_users = [];
    this.category = category;
    this.permissions = permissions || [];
    this.command_locks = [];
    this.operation = operation;
    this.disabled = disabled || false;
    
    if (this.disabled) {
      console.log(this.name+" has been disabled!");
    };
    
    commands[this.name] = this; // Add it to the container
  };
  
  lock(user_id) {
    if (!user_id) {
      return;
    };
    
    this.command_locks["User"+user_id] = true;
    
    this.user_id = user_id;
  };
  
  unlock(user_id) {
    
  }
  
  execute(bot,args,msg,debug) {
    const time = new Date().getTime();
    
    if (!debug) {
      
      // Check if the user is command-blocked
      if (this.command_locks["User"+msg.author.id]) {
        return;
      };
      
      // Block the execution if the command is disabled
      if (this.disabled) {
        console.log("Unable to run command "+this.name+": The command is disabled");
        bot.createMessage(msg.channel.id,"that command has been disabled! :scream_cat:");
        return false,"command disabled";
      };
      
      // Check if the user is allowed to run the command
      var allowed = true;
      
      for (var i = 0; i < this.permissions.length; i++) {
        if (this.permissions[i] === "dragon") {
          var dragon;
          for (var i = 0; i < permissions.dragons.length; i++) {
            if (permissions.dragons[i] === msg.author.id) {
              dragon = true;
              break;
            };
          };
          if (!dragon) {
            console.log("Permission error: "+msg.author.username+"#"+msg.author.discriminator+" ("+msg.author.id+") isn't an operator, so they can't run "+this.name)
            allowed = false;
            break;
          };
        };
      };
      
      if (!allowed) {
        return;
      };
      
      // Check user rate limits
      var cooled_user = this.cooled_users.find(function(user) {
        if (user.id === msg.author.id) {
          return user;
        };
      });
      
      // Check if the time-limit had passed
      if (cooled_user) { 
        if (cooled_user.cooled_time+this.cooldown < time) {
          return false,"user cooled";
        };
        // Un-cool the user
      };
      
      // Mark the user to make sure they don't stress the bot
      
    };
    
    try {
      this.operation(bot,args,msg);
      return true; // Success!
    } 
    catch (err) {
      console.log("An error has occurred when trying to execute "+this.name+": "+err)
      bot.createMessage(msg.channel.id,"error!!1\n```js\n"+err+"```");
      return false;
    };
  };
}

// List of commands
new Command("prune",[],"",5,"mod",undefined,undefined,async function(bot,args,msg) {
  
  // Make sure we're allowed to delete messages
  console.log("Checking if I can delete messages in #"+msg.channel.name+" ("+msg.channel.id+") in "+msg.channel.guild.name+" ("+msg.channel.guild.id+")...");
  
  const botMember = msg.channel.guild.members.find(function(member) {
    if (member.id === bot.user.id) {
      return member;
    };
  });
  
  if (botMember) {
    if (!botMember.permission.has("administrator")) {
      if (botMember.permission.has("manageMessages")) {

        // Check channel overwrites
        if (!msg.channel.permissionsOf(bot.user.id).has("manageMessages")) {
          bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> I don't have permission to delete messages in this channel!");
          return;
        };
        
        console.log("I can delete messages in "+msg.channel.guild.id+" ("+msg.channel.guild.id+"). Continuing...");
        
      } else {
        bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> I don't have permission to delete messages!");
        return;
      };
    };
  } else {
    console.warn("I couldn't find myself in the member list of "+msg.channel.guild.name+" ("+msg.channel.guild.id+").");
    return;
  };
  
  // Make sure they're allowed to delete messages
  if (!msg.member.permission.has("administrator")) {
    if (msg.member.permission.has("manageMessages")) {

      // Check channel overwrites
      if (!msg.channel.permissionsOf(msg.author.id).has("manageMessages")) {
        console.log(msg.author.username+"#"+msg.author.discriminator+" doesn't have permission to delete messages in "+msg.channel.guild.id+" ("+msg.channel.guild.id+").");
      bot.createMessage(msg.channel.id,{content:"<@"+msg.author.id+"> What's the password?",embed:{description:"You don't have permission to delete messages in this channel."}});
        return;
      };

      console.log(msg.author.username+"#"+msg.author.discriminator+" can delete messages in "+msg.channel.guild.id+" ("+msg.channel.guild.id+"). Continuing...");
    } else {

      // Check channel overwrites
      if (!msg.channel.permissionsOf(msg.author.id).has("manageMessages")) {
        console.log(msg.author.username+"#"+msg.author.discriminator+" doesn't have permission to delete messages in "+msg.channel.guild.id+" ("+msg.channel.guild.id+").");
        bot.createMessage(msg.channel.id,{content:"<@"+msg.author.id+"> What's the password?",embed:{description:"You don't have permission to delete messages."}});
        return;
      };
    };
  };
  
  // Check if they told us how many they wanted to delete
  if (!args) {
    bot.createMessage(msg.channel.id,{content:"<@"+msg.author.id+"> How many messages do you want me to absolutely destroy?",embed:{description:"Command usage: "+api.config.prefix+"prune **<a number from 0 to 6000>**"}});
    return;
  };
  
  // Check to see if the first argument is a number and 1 <= n >= 6000
  const amountOfMessages = parseInt(args.indexOf(" ") > -1 ? args.indexOf(" ") : args, 10);
  
  if (!isNaN(amountOfMessages)) {
    if (amountOfMessages > 6000) {
      bot.createMessage(msg.channel.id,{content:"<@"+msg.author.id+"> woah! too many messages, buckeroo.",embed:{description:"Command usage: "+api.config.prefix+"prune <a number from 0 to **6000**>"}});
      return;
    } else if (amountOfMessages == 0) {
      bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> Successfully deleted 0️⃣ messages. ");
      return;
    } else if (amountOfMessages < 0) {
      bot.createMessage(msg.channel.id,{content:"<@"+msg.author.id+"> I can't delete negative messages...or can I?",embed:{description:"Command usage: "+api.config.prefix+"prune <a number from **0** to 6000>"}});
      return;
    };
  } else {
    bot.createMessage(msg.channel.id,{content:"<@"+msg.author.id+"> \""+(args.indexOf(" ") > -1 ? args.indexOf(" ") : args)+"\" isn't a number.",embed:{description:"Command usage: "+api.config.prefix+"prune <**a number** from 0 to 6000>"}});
    return;
  };
  
  // Commense the purging!
  bot.sendChannelTyping(msg.channel.id);
  
  try {
    const messages = await bot.getMessages(msg.channel.id,amountOfMessages+1);
    var messageIds = [];
    
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].id === msg.id) continue;
      
      messageIds.push(messages[i].id);
    };
  
    await bot.deleteMessages(msg.channel.id,messageIds);
    
    const confirmMessage = await bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> Successfully obliterated "+amountOfMessages+" "+(amountOfMessages === 1 ? "message!" : "messages!"));
    
    // Delete messages
    setTimeout(function() {
      bot.deleteMessages(msg.channel.id,[msg.id,confirmMessage.id]);
    },3000);
    
  } catch (err) {
    console.warn(err);
  };
  
});

new Command("invite",[],"",10,"core",undefined,undefined,function(bot,args,msg) {
  const inviteLink = "https://discordapp.com/api/oauth2/authorize?client_id=452818283863736345&permissions=8&scope=bot";
  bot.createMessage(msg.channel.id,"Invite me to your server! \n"+inviteLink);
},true);

new Command("help",["cmds","commands"],"",10,"core",undefined,undefined,function(bot,args,msg) {
  
  // Get all commands
  var list = {};
  for (var command in commands) {
    if (commands[command].disabled) {
      continue;
    } else if (commands[command].category && list[commands[command].category]) {
      list[commands[command].category].push(command);
    } else {
      console.log("[INFO] Command "+command+" does not have a category");
    };
  };
  
});

new Command("message",["msg"],"",5,"mod",undefined,undefined,function(bot,args,msg) {
  console.log(msg.mentions[0])
  if (!api.makuwro.isMember(msg.author.id)) {
    bot.createMessage(msg.channel.id,{content:"No thanks.",embed:{title:"Global permission error",color:16726843,description:"You're not a member of the Makuwro clan.",author:{name:"Dragon Makuwro"},footer:{text:"Responding to "+msg.member.user.username+"#"+msg.member.user.discriminator}}})
    return;
  } else if (!msg.mentions[0]) {
    bot.createMessage(msg.channel.id,{content:"Who do I message?",embed:{title:"Missing arguments",description:api.prefix+cmd+" **<author>** <message>"}})
    return;
  }

  var user = msg.mentions[0];
  var message = msg.content.replace(api.prefix+"message <@"+user.id+"> ","");

  if (message == msg.content) {
    bot.createMessage(msg.channel.id,{content:"I can't send nothing.",embed:{title:"Missing arguments",description:api.prefix+cmd+" <author> **<message>**"}})
    return;
  }

  bot.getDMChannel(user.id)
  .then(function(channel) {
    console.log(msg.attachments)
    bot.createMessage(channel.id,{embed:{title:"New message",description:message,color:46801,author:{name:msg.author.username+"#"+msg.author.discriminator,icon_url:msg.author.avatarURL}}})
    msg.delete()
    bot.createMessage(msg.channel.id,"Message sent!")
    .then(function(mess) {
      setTimeout(function() {mess.delete()},5000)
    })
  })
  .catch(function(err) {
    console.log(err)
    bot.createMessage(msg.channel.id,"I couldn't relay that message.")
  });
},true);

new Command("warn",[],"",5,"mod",undefined,undefined,function(bot,args,msg) {
  if (msg.member.permission.has("kickMembers") || msg.member.permission.has("banMembers")) {
    if (msg.mentions[0]) {
      // Assume the position...
      var victim = msg.channel.guild.members.find(function(m) {
        if (m.id === msg.mentions[0].id) return m;
      });

      if (api.members.get_highest_role_position(msg.member) <= api.members.get_highest_role_position(victim)) {
        bot.createMessage(msg.channel.id,"you can't warn that person");
        return;
      };

      if (api.members.get_highest_role_position(msg.channel.guild.members.find(function(m) {
        if (m.id === bot.user.id) {
          return m;
        };
      })) <= api.members.get_highest_role_position(victim)) {
        // sigh.
        bot.createMessage(msg.channel.id,"i can't warn that person");
        return;
      };

      // Now to the warning >:)
      if (victim.permission.has("administrator")) {
        // sigh.
        bot.createMessage(msg.channel.id,"you can't warn an admin");
      } else {
        bot.createMessage(msg.channel.id,"alright, <@"+victim.id+"> has been warned");
      };
    } else {
      bot.createMessage(msg.channel.id,"<@"+msg.author.id+">");
    };
  } else {
    bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> no touch");
  };
});

new Command("eval",[],"",0,"debug",undefined,["dragon"],function(bot,args,msg) {
  try {
    eval(args);
    bot.addMessageReaction(msg.channel.id,msg.id,"✅");
  } catch (err) {
    bot.addMessageReaction(msg.channel.id,msg.id,"❌");
    bot.createMessage(msg.channel.id,"Something bad happened!\n```js\n"+err+"```");
  };
});

new Command("logs",["log","logging"],"Manage log settings",5,"server_management",undefined,"[start/exclude/stop] [#channel (not required for stop)]",async function(bot,args,msg) {
  
  // Verify permissions
  if (!msg.member.permission.has("manageMessages")) {
    bot.createMessage("<@"+msg.author.id+"> You don't have permission to manage logs in this server");
    return;
  };
  
  // Get guild config
  const guildConfig = api.guilds.get_server_config(msg.channel.guild.id);
  
  // Return logging status
  if (args) {
    
    // Make sure that everything matches
    args = args.toLowerCase();
    
    if (args.substring(0,5) === "start") {
      
      // Make sure there's a channel mentioned
      if (!msg.channelMentions[0]) {
        bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> You need to specify a `#channel` to start logging!");
        return;
      };
      
      // Enable logging if it wasn't already enabled
      var logging_reenabled = false;
      if (guildConfig.loggingEnabled === 0) {
        api.moderation.enable_logging(msg.channel.guild.id);
        logging_reenabled = true;
      };
      
      if (guildConfig.loggingChannelId === msg.channelMentions[0]) {
        bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> "+(logging_reenabled ? "Logging has been re-enabled. Logs are being sent to <#"+msg.channelMentions[0]+">." : "<#"+msg.channelMentions[0]+"> is already being used for logging!"));
        return;
      };
      
      // Change log channel
      api.moderation.set_logging_channel(msg.channel.guild.id, msg.channelMentions[0]);
      
      // Done.
      bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> Successfully set logging channel to <#"+msg.channelMentions[0]+"> 👍");
      
      return;
    } else if (args.substring(0,7) === "exclude") {
      
      // Check for user flag
      if (args.match(/-user <@\d+>/)) {
        console.log(args.match(/-user <@\d+>/));
      };
      
      return;
    } else if (args.substring(0,4) === "stop" || args.substring(0,5) === "pause" || args.substring(0,6) === "disable") {
      
      // Make sure logging is enabled
      if (logging_status.logging_enabled === 0) {
        bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> Logging is already disabled.");
        return;
      };
      
      // Disable logging
      db.prepare("update GuildLoggingInfo set logging_enabled = 0 where guild_id = (?)").run(msg.channel.guild.id);
      
      // Send response
      bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> Logging has been disabled 👍");
      
      return;
    };
  
  };
  
  bot.createMessage(msg.channel.id,"Logging **has"+(logging_status.logging_enabled ? "" : " not")+"** been enabled on this server"+(logging_status.logging_enabled ? ". Logs are being recorded at <#"+logging_status.logging_channel+">." : " yet. Use `"+api.config.prefix+"logs start <#channel>` to begin logging the server.") );
  
});

new Command("about",["toasty"],"Some info about the Toasty bot",5,"meta",undefined,undefined,async function(bot,args,msg) {
  
  // Get server prefix
  const server_prefix = await db.prepare("select prefix from GuildConfigSettings where guild_id = (?)").get(msg.channel.guild.id) || api.config.prefix;
  
  // Send message
  bot.createMessage(msg.channel.id,{embed:{
    author: {
      name: "Toasty "+api.version.major+"."+api.version.minor+"."+api.version.patch
    },
    description: "Test"
  }});
  
});

new Command("hchannel",[],"",5,"server-admin",undefined,undefined,async function(bot,args,msg) {
  
  // Check user's permissions
  
  // Check desired action
  if (args.toLowerCase().substring(0,3) === "set") {
    
    const star = (args.toLowerCase().substring(4,8) === "star");
    const shame = (args.toLowerCase().substring(4,9) === "shame");
    
    if (star || shame) {
      
      // Make sure the user specified a channel
      if (!msg.channelMentions[0]) {
        bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> You didn't tell me the channel you wanted to set as the "+(star ? "highlight" : "shame")+" channel.");
        return;
      };

      // Set highlight channel
      var guildSettings = db.get_global_database().prepare("select * from GuildConfiguration where guildId = (?)").get(msg.channel.guild.id);

      // Create settings if they don't exist
      if (!guildSettings) {
        
      };

      // Update highlight channel
      db.get_global_database().prepare("update GuildConfiguration set "+(star ? "highlight" : "shame")+"_channel = (?) where guildId = (?)").run(msg.channelMentions[0], msg.channel.guild.id);

      // Success message
      bot.createMessage(msg.channel.id,"<@"+msg.author.id+"> The "+(star ? "highlight" : "shame")+" channel has been set to <#"+msg.channelMentions[0]+">!");
      return;
      
    };
    
  };
  
});

new Command("archive",[],"",5,"server-admin",undefined,undefined,async function(bot,args,msg) {
  
  if (args.toLowerCase().substring(0, 11) === "set channel") {

    // Get archive channel ID
    const archiveChannelId = args.match(/set channel <#(\d+)>/)[1] || args.match(/set channel (\d+)/)[1];
    if (!archiveChannelId) {
      msg.channel.createMessage({
        content: "<@" + msg.author.id + ">, you didn't tell me a channel to send archives to!",
        embed: {
          description: "Valid usage:\narchive set channel **<#channel>**"
        }
      });

      return;
    };

    // Get channel from ID
    const archiveChannel = msg.channel.guild.channels.find(function(channel) {
      if (channel.id === archiveChannelId) {
        return channel;
      };
    });
    if (!archiveChannel) {
      msg.channel.createMessage("<@" + msg.author.id + ">, there is no channel in this server with ID " + archiveChannelId);
      
      return;
    };

    // Check if there's already a row for the archive
    const globalDatabase = api.database.get_global_database();
    if (globalDatabase.prepare("select exists(select 1 from ArchiveSettings where guildId = (?) limit 1)")) {
      globalDatabase.prepare("update ArchiveSettings set archiveChannelId = (?) where guildId = (?)").run(archiveChannelId, msg.channel.guild.id);
    } else {
      globalDatabase.prepare("insert into ArchiveSettings (guildId, archiveChannelId) values (?, ?)").run(msg.channel.guild.id, archiveChannelId);
    };

    // Success!
    msg.channel.createMessage("<@" + msg.author.id + "> Updated archive channel to <#" + archiveChannelId + ">");

    return;

  };

  // Make sure the user is a server manager
  if (!msg.member.permission.has("manageGuild")) {
    return;
  };
  
  // Tell the user that this may take a long time
  await msg.channel.createMessage("<@"+msg.author.id+"> Getting **all** messages in this channel before this one I just sent. This may take a long time if there are a lot of messages. Please wait!").id;
  
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
        lastMessageId = currentMessageList[currentMessageList.length-1].id;
        
        // Keep searching
        keepGoing();
        
      }, 3000);

    } else {

      messages = messages.reverse();

      // Convert message array into JSON
      const jsonString = JSON.stringify(messages);
      
      // Create archive channel
      const archiveChannel = await bot.createChannel(
          "609990107604451349", 
          msg.channel.name,
          0,
          {
              parentID: "724780515747561572"
          });
      
      var userIcons = {};
      async function getUserIconFromUser(user) {
        
        if (!userIcons[user.id]) {
          
          // Get user avatar URL
          const avatarResponse = await fetch(user.avatarURL),
                avatarBuffer = await avatarResponse.buffer();
          
          const botMessage = await archiveChannel.createMessage( 
                            user.username + "#" + user.discriminator + "'s avatar: ", 
                            {
                              file: avatarBuffer,
                              name: "AVI_" + user.id + ".png"
                            });
          
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
      
    };
    
  };
  
  keepGoing();
  
});

console.log("Successfully added "+Object.keys(commands).length+" commands!");

module.exports = commands; 
