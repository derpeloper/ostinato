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

const dbPath = path.join(dataDir, 'database.db');

function openDatabase() {
    let db;
    try {
        db = new Database(dbPath);
        db.pragma('integrity_check');
        db.pragma('journal_mode = WAL');
        return { db, wasCorrupt: false };
    } catch (err) {
        if (err.code === 'SQLITE_CORRUPT' || (err.message && err.message.includes('malformed'))) {
            console.error('[Database] Corrupt database detected. Backing up and creating a fresh one...');
            try { db?.close(); } catch (_) { }

            const backupName = `database.corrupt.${Date.now()}.db`;
            const backupPath = path.join(dataDir, backupName);
            try {
                fs.copyFileSync(dbPath, backupPath);
                console.log(`[Database] Corrupt database backed up to: ${backupName}`);
            } catch (copyErr) {
                console.error('[Database] Failed to back up corrupt database:', copyErr.message);
            }

            for (const ext of ['-wal', '-shm']) {
                const walPath = dbPath + ext;
                if (fs.existsSync(walPath)) {
                    try {
                        fs.copyFileSync(walPath, backupPath + ext);
                    } catch (_) { }
                }
            }

            try { fs.unlinkSync(dbPath); } catch (_) { }
            try { fs.unlinkSync(dbPath + '-wal'); } catch (_) { }
            try { fs.unlinkSync(dbPath + '-shm'); } catch (_) { }

            const freshDb = new Database(dbPath);
            freshDb.pragma('journal_mode = WAL');
            return { db: freshDb, wasCorrupt: true, backupPath };
        }
        throw err;
    }
}

const { db, wasCorrupt, backupPath } = openDatabase();

const SCHEMA = [
    {
        name: 'names',
        columns: [
            { name: 'user', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'guild', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'name', type: 'TEXT', constraints: 'NOT NULL' }
        ],
        primaryKey: ['user', 'guild']
    },
    {
        name: 'voices',
        columns: [
            { name: 'user', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'guild', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'voice', type: 'TEXT', constraints: 'NOT NULL' }
        ],
        primaryKey: ['user', 'guild']
    },
    {
        name: 'speeds',
        columns: [
            { name: 'user', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'guild', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'speed', type: 'REAL', constraints: 'NOT NULL' }
        ],
        primaryKey: ['user', 'guild']
    },
    {
        name: 'langs',
        columns: [
            { name: 'user', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'guild', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'lang', type: 'TEXT', constraints: 'NOT NULL' }
        ],
        primaryKey: ['user', 'guild']
    },
    {
        name: 'restrictions',
        columns: [
            { name: 'guild', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'restricted', type: 'INTEGER', constraints: 'NOT NULL' }
        ],
        primaryKey: ['guild']
    },
    {
        name: 'disabled',
        columns: [
            { name: 'user', type: 'TEXT', constraints: 'NOT NULL' }
        ],
        primaryKey: ['user']
    },
    {
        name: 'guild_langs',
        columns: [
            { name: 'guild', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'lang', type: 'TEXT', constraints: 'NOT NULL' }
        ],
        primaryKey: ['guild']
    },
    {
        name: 'message_filters',
        columns: [
            { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
            { name: 'guild', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'pattern', type: 'TEXT', constraints: 'NOT NULL' }
        ],
        primaryKey: null
    },
    {
        name: 'name_filters',
        columns: [
            { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY AUTOINCREMENT' },
            { name: 'guild', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'pattern', type: 'TEXT', constraints: 'NOT NULL' }
        ],
        primaryKey: null
    },
    {
        name: 'alt_channels',
        columns: [
            { name: 'guild', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'channel', type: 'TEXT', constraints: 'NOT NULL' }
        ],
        primaryKey: ['guild']
    },
    {
        name: 'autojoin',
        columns: [
            { name: 'guild', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'enabled', type: 'INTEGER', constraints: 'NOT NULL DEFAULT 0' }
        ],
        primaryKey: ['guild']
    },
    {
        name: 'inject_usage',
        columns: [
            { name: 'user', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'guild', type: 'TEXT', constraints: 'NOT NULL' },
            { name: 'used_at', type: 'INTEGER', constraints: 'NOT NULL' }
        ],
        primaryKey: null
    }
];

/**
 * builds a CREATE TABLE statement from a schema definition.
 */
function buildCreateTableSQL(tableDef) {
    const colDefs = tableDef.columns.map(col => {
        return `${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`;
    });

    if (tableDef.primaryKey && tableDef.primaryKey.length > 0) {
        colDefs.push(`PRIMARY KEY (${tableDef.primaryKey.join(', ')})`);
    }

    return `CREATE TABLE IF NOT EXISTS ${tableDef.name} (\n        ${colDefs.join(',\n        ')}\n    )`;
}

/**
 * returns a default value string for ALTER TABLE ADD COLUMN, based on column type.
 * NOT NULL columns need a default so existing rows aren't broken.
 */
function getDefaultForType(type) {
    const upper = type.toUpperCase();
    if (upper === 'TEXT') return "''";
    if (upper === 'REAL') return '0.0';
    if (upper === 'INTEGER') return '0';
    return "''";
}

/**
 * runs the automatic migration: compares desired schema against the live database
 * and applies CREATE TABLE / ALTER TABLE ADD COLUMN as needed.
 */
function migrateSchema() {
    const existingTables = new Set(
        db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name)
    );

    for (const tableDef of SCHEMA) {
        if (!existingTables.has(tableDef.name)) {
            const sql = buildCreateTableSQL(tableDef);
            db.exec(sql);
            console.log(`[Database Migration] Created table: ${tableDef.name}`);
            continue;
        }

        const liveColumns = db.prepare(`PRAGMA table_info(${tableDef.name})`).all();
        const liveColumnNames = new Set(liveColumns.map(c => c.name));

        for (const col of tableDef.columns) {
            if (!liveColumnNames.has(col.name)) {
                let alterSQL = `ALTER TABLE ${tableDef.name} ADD COLUMN ${col.name} ${col.type}`;

                if (col.constraints) {
                    const hasNotNull = /NOT NULL/i.test(col.constraints);
                    const cleanedConstraints = col.constraints
                        .replace(/NOT NULL/i, '')
                        .replace(/PRIMARY KEY AUTOINCREMENT/i, '')
                        .trim();

                    if (cleanedConstraints) {
                        alterSQL += ` ${cleanedConstraints}`;
                    }

                    if (hasNotNull && !/DEFAULT/i.test(col.constraints)) {
                        alterSQL += ` DEFAULT ${getDefaultForType(col.type)}`;
                    }
                }

                db.exec(alterSQL);
                console.log(`[Database Migration] Added column '${col.name}' to table '${tableDef.name}'`);
            }
        }
    }
}

try {
    migrateSchema();
    console.log('[Database] Schema migration complete.');
} catch (err) {
    console.error('[Database] Migration error:', err);
}

// ---------------------------------------------------------------------------
// data recovery: if we started from a corrupt database, try to salvage data
// ---------------------------------------------------------------------------

if (wasCorrupt && backupPath && fs.existsSync(backupPath)) {
    console.log('[Database] Attempting to recover data from corrupt backup...');
    let corruptDb;
    try {
        corruptDb = new Database(backupPath, { readonly: true, fileMustExist: true });
        let totalRecovered = 0;

        for (const tableDef of SCHEMA) {
            try {
                const rows = corruptDb.prepare(`SELECT * FROM ${tableDef.name}`).all();
                if (rows.length === 0) continue;

                const colNames = tableDef.columns.map(c => c.name);
                const placeholders = colNames.map(() => '?').join(', ');
                const insert = db.prepare(
                    `INSERT OR IGNORE INTO ${tableDef.name} (${colNames.join(', ')}) VALUES (${placeholders})`
                );

                const insertMany = db.transaction((rows) => {
                    for (const row of rows) {
                        try {
                            const values = colNames.map(c => row[c] !== undefined ? row[c] : null);
                            insert.run(...values);
                        } catch (_) {  }
                    }
                });

                insertMany(rows);
                totalRecovered += rows.length;
                console.log(`[Database Recovery] Recovered ${rows.length} rows from '${tableDef.name}'`);
            } catch (tableErr) {
                console.warn(`[Database Recovery] Could not recover table '${tableDef.name}': ${tableErr.message}`);
            }
        }

        console.log(`[Database Recovery] Done. Total rows recovered: ${totalRecovered}`);
    } catch (recoverErr) {
        console.error('[Database Recovery] Could not open corrupt backup for recovery:', recoverErr.message);
    } finally {
        try { corruptDb?.close(); } catch (_) { }
    }
}

db.getUserPreferences = db.prepare(`
    SELECT 
        (SELECT name FROM names WHERE user = @user AND guild = @guild) AS name,
        (SELECT voice FROM voices WHERE user = @user AND guild = @guild) AS voice,
        (SELECT speed FROM speeds WHERE user = @user AND guild = @guild) AS speed,
        (SELECT lang FROM langs WHERE user = @user AND guild = @guild) AS lang
`);

console.log('[Database] Initialized better-sqlite3 database at ' + path.join(dataDir, 'database.db'));

module.exports = db;