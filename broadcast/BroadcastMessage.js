const channels = require("./channels.json");
const roles = require("../commands/broadcast/allowed_roles.json").roles;

class BroadcastMessage {
  constructor(bot, data = {}) {
    this.Client = bot;
    if (typeof data.type === "string")
      this.type = data.type;
    if (typeof data.timeout === "number" || typeof data.timeout === "string")
      // convert to minutes
      this.timeout_delay = data.timeout * 1000 * 60;
    if (typeof data.interval === "number" || typeof data.interval === "string")
      this.interval_delay = data.interval * 1000 * 60;
    if (typeof data.func === "function" || data.func === "delete")
      this.func = data.func;
      this.event = data.event;
  }

  /**
   * start an interval for the message
   * @return {number} the id of the interval
   */
  startInterval() {
    if (!this.interval_delay || !this.event) return false;
    let bm = this;
    this.interval = setInterval(() => {
      console.log(`Updating ${bm.event.guid}`);
      bm.event.update(bm);
    }, bm.interval_delay);
    return this.interval;
  }

  /**
   * stop the interval for the message
   * @return {undefined} undefined return type
   */
  stopInterval() {
    clearInterval(this.interval);
    return undefined;
  }

  /**
   * start a timeout
   * @return {number} the id of the timeout
   */
  startTimeout() {
    if (!this.timeout_delay || !this.func) return false;
    let bm = this;
    if (bm.func === "delete") {
      this.timeout = setTimeout(() => {
        bm.message.delete().then((msg) => {
          console.log("Deleted a timeout message.");
        }).catch((e) => {
          console.error(e);
        })
      }, bm.timeout_delay);
    } else {
      bm.timeout = setTimeout(() => {
        bm.func(this);
      }, bm.timeout_delay);
    }
    return this.timeout;
  }

  /**
   * actually send out a message
   * @param {string} content the content of the message
   */
  broadcast(content) {
    let bm = this;
    let bot = bm.Client;
    // look for an WF Alerts channel and broadcast to it
    bot.guilds.forEach((guild) => {
      let mentions = BroadcastMessage.getMentions(guild, content);
      let channel = guild.channels.find("name", "wf_alerts");
      if (channel) {
        setTimeout(() => {
          channel.sendMessage(content + mentions)
            .then((msg) => {
              bm.message = msg;
              if (bm.startTimeout()) console.log(`Started Timeout ${bm.event.guid}, ${bm.timeout_delay}`);
              if (bm.startInterval()) console.log(`Started Interval ${bm.event.guid}, ${bm.interval_delay}`);
            })
            .catch((e) => {
              console.error(e);
            })
        }, Math.random() * 10000);
      }
    })
    // if you have your channel in the channels file
    // however, heroku doesn't save local files so they'll
    // just disappear so the solution is the above one
    // leaving this in so people can tell me what to add i guess
    for (let guild in channels) {
      if (!bot.guilds.get(guild)) continue;
      let mentions = BroadcastMessage.getMentions(guild, content);
      let channel = bot.guilds.get(guild).channels.get(channels[guild].Channel);
      // try to prevent sendMessage spam so put a random up to 10 second delay
      if (channel) {
        setTimeout(() => {
          channel.sendMessage(content + mentions)
            .then((msg) => {
              bm.message = msg;
              if (bm.startTimeout()) console.log(`Started Timeout ${bm.event.guid}, ${bm.timeout_delay}`);
              if (bm.startInterval()) console.log(`Started Interval ${bm.event.guid}, ${bm.interval_delay}`);
            })
            .catch((e) => {
              console.error(e);
            })
        }, Math.random() * 10000);
      }
    }
  }

  /**
   * adds mentions to a message based on whats in it look at
   * look at bm.event.type - only add mentions if its alerts and stuff? well the allowed roles filter it out anyways
   * @param {Guild} guild the guild that the content is being sent to, looking at the roles of THIS guild
   * @param {string} content the content to look at
   */
  static getMentions(guild, content) {
    let mentions = [];
    for (let idx = 0; idx < roles; idx++) {
      let x = false;
      if (content.toLowerCase().includes(roles[idx].toLowerCase()) && (x = guild.roles.find((role) => {
        let lname = role.name.toLowerCase();
        return roles.includes(lname) && args.includes(lname);
      }))) {
        // weird indentation but if you're in here the role matches and exists
        mentions.push(x);
      }
    }
    return mentions;
  }
}

module.exports = BroadcastMessage;