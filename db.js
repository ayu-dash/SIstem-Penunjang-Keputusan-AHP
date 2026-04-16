const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'spk_properti.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS kriteria (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        nama    TEXT    NOT NULL DEFAULT '',
        sifat   TEXT    NOT NULL DEFAULT 'benefit' CHECK(sifat IN ('benefit', 'cost')),
        bobot   REAL    NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS alternatif (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        nama    TEXT    NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS nilai (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        alternatif_id   INTEGER NOT NULL,
        kriteria_id     INTEGER NOT NULL,
        nilai           REAL    NOT NULL DEFAULT 0,
        FOREIGN KEY (alternatif_id) REFERENCES alternatif(id) ON DELETE CASCADE,
        FOREIGN KEY (kriteria_id)   REFERENCES kriteria(id)   ON DELETE CASCADE,
        UNIQUE(alternatif_id, kriteria_id)
    );
`);

console.log('✦ Database ready →', DB_PATH);

module.exports = db;
