const Commands = require("../commands");

module.exports = function() {
  new Commands.new("about", ["toasty", "info"], "about", (bot, args, msg) => {
    msg.channel.createMessage({
      content: "<@" + msg.author.id + ">",
      embed: {
        author: {
          name: "Toasty",
          icon_url: bot.user.avatarURL,
          url: "https://toasty.makuwro.com"
        },
        description: "Toasty makes message management easier for server admins. JSON logs? Done. Webhooks? We got 'em. Cross-dimensional communication? Oh yes!\n[You can bring a Toasty™ to your home](https://toasty.makuwro.com/invite) for the low, low price of FREE! Terms and conditions apply; limited time only.\n\nWell, we were kidding about that last part.",
        fields: [{
          name: "🌐 This bot is hosted by Makuwro",
          value: "But, [you can build it yourself](https://github.com/makuwro/toasty) if you'd like ;)\n~~pls pull request ily <3~~"
        }],
        footer: {
          text: "Version " + process.env.npm_package_version
        }
      }
    });
  });
};