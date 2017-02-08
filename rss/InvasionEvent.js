const RSSEvent = require("./RSSEvent");
const request = require("request");
// is required in event so i dont know why its needed here
// probably no super or something??
const BroadcastMessage = require("../broadcast/BroadcastMessage");

let invasions = {};

/**
 * update the invasions information from the WorldState
 */
function updateInvasions() {
  request({uri: "http://content.warframe.com/dynamic/worldState.php"}, (err, response, body) => {
    if (err) return console.error(err);
    if (response.statusCode != 200) return console.error(response);
    invasions = JSON.parse(body).Invasions;
    console.log(`Updated ws_invasions information.`);
  });
}

updateInvasions();
setInterval(updateInvasions, 9 * 1000 * 60);

class InvasionEvent extends RSSEvent{
  constructor(guid, author, title, pubDate) {
    super(guid, author, title.replace("PHORID SPAWN ", ""), pubDate);
  }

  /**
   * broadcast the message
   * @param {Object} data default arguments that will be passed to the BroadcastMessage constructor
   */
  broadcast(bot, data = {interval: 10, event: this, func: this.update}) {
    let bm = new BroadcastMessage(bot, data);
    // TODO update broadcast message
    let content = `\`\`\`diff\n+ [GUID]: ${this.guid}\n- [${this.type}] -\n+ [Title]: ${this.title}\n+ [Date]: ${this.date}\n\`\`\``;
    // timestamp broadcast
    bm.broadcast(new Date(Date.now()).toUTCString() + content);
  }

  /**
   * update the BroadcastMessage
   * @param {BroadcastMessage} bm the BroadcastMessage that will be updated
   * @param {InvasionEvent} obj the InvasionEvent that holds the data
   */
  update(bm) {
    // console.log("this" + JSON.stringify(this, null, 2));
    // console.log(`updating ${event.guid}`);
    // example titles:
    // Grineer (3x Detonite Injector) VS. Corpus (3x Fieldron) - Palus (Pluto)
    // 4700cr - Unda (Venus) - 41m
    // looks like location is always after -
    // rewards are always before -
    // this is an invasions so always vs
    let obj = bm.event;
    let width = 80;
    let content = "```diff\n";
    let location = obj.title.split(" - ");
    let factions = location[0].split(" VS. ");
    location = location[1];
    content += `+ [${obj.type}]`
    content += "\n";
    content += `+ [Location]: ${location}`;
    content += "\n";
    // at least 1 faction but can't guarantee 2
    let second_length = factions[1] ? factions[1].length : 0;
    // math abs to avoid negative numbers that are off by like 1 xd
    content += `--- ${factions[0]}${" ".repeat(Math.abs(width - factions[0].length - second_length - 8))}${factions[1] ? factions[1]:""} ---`
    content += "\n";
    for (let idx = 0; idx < invasions.length; idx++) {
      if (invasions[idx]["_id"]["$oid"] === obj.guid) {
        let info = invasions[idx];
        if (info.Completed) break; // if its completed, delete message and stop interval
        let pct = (info.Goal - info.Count) / (info.Goal * 2);
        let somenum = width * pct;
        content += `+${"#".repeat(Math.abs(width - somenum - 1))}`;
        content += "\n";
        content += `-${" ".repeat(Math.abs(width-somenum - 1)) + "#".repeat(somenum)}`;
        content += "```";
        // timestamp message
        return bm.message.edit(new Date(Date.now()).toUTCString() + content)
        .then((msg) => {
          console.log("Edited an invasion message.");
        }).catch((e) => {
          console.error(e);
        });
      }
    }
    // if we couldnt match the guid then delete the message
    // and stop the interval
    bm.message.delete().then((msg) => {
      console.log("Deleted an invasion message.");
    }).catch((e) => {
      console.error(e);
    });
    bm.stopInterval();
  }
}

module.exports = InvasionEvent;