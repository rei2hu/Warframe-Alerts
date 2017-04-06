const RSSFeed = require("./feed/RSSFeed.js");
const MessageBroadcaster = require("./MessageBroadcaster.js");
const InvasionBroadcaster = require("./InvasionBroadcaster.js");

class EventManager {
  constructor(client, type) {
    this.client = client;
    if (!EventManager.broadcaster)
      EventManager.broadcaster = new MessageBroadcaster(this.client); // shoud be static
    if (!EventManager.iBroadcaster)
      EventManager.iBroadcaster = new InvasionBroadcaster(this.client);
    this.feed = new RSSFeed(type, EventManager.broadcaster, EventManager.iBroadcaster);
    this.feed.updateFeed(false); // change to false when releasing
  }

  watch() {
    const em = this;
    // 5 minutes to check the feed
    this.timeout = setInterval(() => {
      console.log("Updated RSS Feed");
      em.feed.updateFeed()
    }, 5 * 60e3);
    // 5 minutes to update the invasion statuses
    this.invasionTimeout = setInterval(() => {
      console.log("Updating invasions");
      EventManager.iBroadcaster.update();
    }, 5 * 60e3);
    // 5 minutes to clean the alert heap
    this.cleanTimeout = setInterval(() => {
      console.log("Checking heap");
      while (EventManager.broadcaster.heap.peek().expiration < Date.now()) {
        const deletion = EventManager.broadcaster.heap.remove();
        // iterate through messages
        for (let i = 0; i < deletion.messages.length; i++) {
          const chan = em.client.channels.get(deletion.messages[i][0]);
          if (!chan) {
            // if this is somehow an incorrect id keep going
            // because there will be other channels to handle
            //
            continue;
          }
          chan.fetchMessage(deletion.messages[i][1]).then((msg) => {
            msg.delete();
          })
        }
      }
    }, 5 * 60e3);
  }
}

module.exports = EventManager;
