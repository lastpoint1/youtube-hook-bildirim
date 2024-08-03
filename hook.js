var parseXml = require("xml2js").parseString;
var pubSubHubbub = require("pubsubhubbub");
var request = require("request").defaults({
  headers: {
    "User-Agent": "ytdsc"
  }
});

// Parsher YouTube
var channelId = "UCQg7G-V-Ms0PYv4aZ2U4QlA" || "YouTube Kanal ID";
var topic = "https://www.youtube.com/xml/feeds/videos.xml?channel_id=" + channelId;
var hub = "https://pubsubhubbub.appspot.com/";

var lastId = "";
var isExiting = false;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', () => {
  console.log('Discord bot ready');
});

client.login(process.env.DISCORD_TOKEN);

var pubSubSubscriber = pubSubHubbub.createServer({
  callbackUrl: "https://replit.com/@LasTPoinT80/youtubehook?s=app"
});

pubSubSubscriber.on("denied", function() {
  console.error("DENIED", JSON.stringify(arguments));
  process.exit(2);
});

pubSubSubscriber.on("error", function() {
  console.error("ERROR", JSON.stringify(arguments));
  process.exit(3);
});

setInterval(function() {
  pubSubSubscriber.subscribe(topic, hub, function(err) {
    if (err) console.error(err);
  });
}, 8600); // refresh subscription every 24 hours

pubSubSubscriber.on("listen", function() {
  console.log("Kanalınıza Bakılıyor");
  // log successful subscriptions
  pubSubSubscriber.on("subscribe", function(data) {
    console.log(
      data.topic +
        " subscribed until " +
        new Date(data.lease * 1000).toLocaleString()
    );
  });
  // resubscribe, if unsubscribed while running
  pubSubSubscriber.on("unsubscribe", function(data) {
    console.log(data.topic + " unsubscribed");
    if (!isExiting) {
      pubSubSubscriber.subscribe(topic, hub, function(err) {
        if (err) console.error(err);
      });
    }
  });
  // Subscribe on start
  pubSubSubscriber.subscribe(topic, hub, function(err) {
    if (err) console.error(err);
  });
  // Parse responses

  pubSubSubscriber.on("feed", function(data) {
    var feedstr = data.feed.toString("utf8");
    parseXml(feedstr, function(err, feed) {
      if (err) {
        console.error("ERROR", err);
      }
      console.log("JSON:", JSON.stringify(feed.feed));
      if (feed.feed.entry) {
        feed.feed.entry.forEach(postToHook);
      } else console.log("Yeni Video");
    });
  });
});

pubSubSubscriber.listen(8080);

function postToHook(entry) {
  console.log("Son", lastId, "Şuanki", entry["yt:videoId"][0]);
  if (
    entry["published"] &&
    entry["yt:channelId"] == channelId &&
    lastId != entry["yt:videoId"][0] &&
    new Date(entry["updated"]).getTime() -
      new Date(entry["published"]).getTime() <
      1 * 30 * 1000 // 1 min
  ) {
    lastId = entry["yt:videoId"][0];
    console.log("newlast", lastId);
    const channel = client.channels.cache.get(1120375072469811282);
    if (channel) {
      channel.send(`||<@&1124380186138394714>|| **Yeni Video Paylaşıldı! Like Atıp Abone Olmayı Unutmayın**: ${entry['title']} - https://youtu.be/${entry['yt:videoId'][0]}`);
    }
  }
}

process.on("SIGINT", function() {
  isExiting = true;
  // Unsubscribe on exit
  pubSubSubscriber.unsubscribe(topic, hub, function(err) {
    if (err) console.log(err);
    process.exit(0);
  });
});