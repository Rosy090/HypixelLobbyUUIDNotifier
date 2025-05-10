const CONFIG_FOLDER = "HypixelLobbyUUIDNotifier";
const TARGETS_FILE = "targets.json";
const CONFIG_FILE = "scanconfig.json";

// Load targets
let targets = [];
const rawTargets = FileLib.read(CONFIG_FOLDER, TARGETS_FILE);
if (rawTargets) {
    try {
        targets = JSON.parse(rawTargets);
    } catch (e) {
        ChatLib.chat("§c[Notifier] Failed to parse targets.json – resetting list.");
        targets = [];
    }
}

// Load config (default: 60 seconds)
let scanInterval = 60;
const rawConfig = FileLib.read(CONFIG_FOLDER, CONFIG_FILE);
if (rawConfig) {
    try {
        scanInterval = JSON.parse(rawConfig).interval || 60;
    } catch (e) {
        scanInterval = 60;
    }
}

function saveTargets() {
    FileLib.write(CONFIG_FOLDER, TARGETS_FILE, JSON.stringify(targets, null, 2));
}

function saveConfig() {
    FileLib.write(CONFIG_FOLDER, CONFIG_FILE, JSON.stringify({ interval: scanInterval }, null, 2));
}

ChatLib.chat(`§d[Notifier] Module loaded. Auto-scan every ${scanInterval}s.`);

function scanPlayers() {
    const serverIP = Server.getIP();
    if (!serverIP || !serverIP.toLowerCase().includes("hypixel")) return;

    const players = World.getAllPlayers();

    players.forEach(player => {
        try {
            const uuid = player.getUUID().toString();
            const name = player.getName();

            const match = targets.find(t => t.uuid === uuid);
            if (match) {
                ChatLib.chat(`§6[Notifier] Player §e${name}§r (Alias: §b${match.alias}§r) is in the lobby!`);
            }
        } catch (err) {
            // silently ignore entity errors
        }
    });
}

// Timer setup
let tickCounter = 0;
register("worldLoad", () => { tickCounter = 0; });

register("tick", () => {
    tickCounter++;
    if (tickCounter < scanInterval * 20) return;
    tickCounter = 0;
    scanPlayers();
});

// Commands

register("command", (uuid, ...aliasParts) => {
    if (!uuid || aliasParts.length === 0) {
        ChatLib.chat("§cUsage: /targetadduuid <uuid> <alias>");
        return;
    }
    const alias = aliasParts.join(" ");
    if (targets.some(t => t.uuid === uuid)) {
        ChatLib.chat(`§eUUID §6${uuid}§e is already in your list.`);
    } else {
        targets.push({ uuid, alias });
        saveTargets();
        ChatLib.chat(`§aAdded → §6${uuid} §awith alias §b${alias}`);
    }
}).setName("targetadduuid");

register("command", uuid => {
    if (!uuid) {
        ChatLib.chat("§cUsage: /targetremoveuuid <uuid>");
        return;
    }
    const idx = targets.findIndex(t => t.uuid === uuid);
    if (idx !== -1) {
        const removed = targets.splice(idx, 1)[0];
        saveTargets();
        ChatLib.chat(`§aRemoved → §6${removed.uuid} (Alias: §b${removed.alias}§a)`);
    } else {
        ChatLib.chat(`§cUUID §6${uuid}§c not found.`);
    }
}).setName("targetremoveuuid");

register("command", () => {
    if (targets.length === 0) {
        ChatLib.chat("§eYour target list is empty.");
    } else {
        ChatLib.chat("§6Tracked UUIDs + Aliases:");
        targets.forEach(t => {
            ChatLib.chat(` - §a${t.uuid} §7(§b${t.alias}§7)`);
        });
    }
}).setName("targetlistuuid");

register("command", () => {
    ChatLib.chat("§b[Notifier] Manual scan started.");
    scanPlayers();
}).setName("scan");

register("command", (seconds) => {
    const secNum = parseInt(seconds);
    if (isNaN(secNum) || secNum < 5 || secNum > 600) {
        ChatLib.chat("§cUsage: /setscaninterval <seconds> (5–600)");
        return;
    }
    scanInterval = secNum;
    saveConfig();
    ChatLib.chat(`§aScan interval set to ${scanInterval} seconds.`);
}).setName("setscaninterval");
