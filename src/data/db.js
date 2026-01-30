/**
 * @file db.js
 * @description initializes the better-sqlite3 database and sets up the schema.
 * "data! data! data! i can't make bricks without clay."
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');


const dataDir = path.join(__dirname);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'database.db'));

db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS names (
        user TEXT NOT NULL,
        guild TEXT NOT NULL,
        name TEXT NOT NULL,
        PRIMARY KEY (user, guild, name)
    );

    CREATE TABLE IF NOT EXISTS voices (
        user TEXT NOT NULL,
        guild TEXT NOT NULL,
        voice TEXT NOT NULL,
        PRIMARY KEY (user, guild, voice)
    );
`);

console.log('[Database] Initialized better-sqlite3 database at ' + path.join(dataDir, 'database.db'));

module.exports = db;
