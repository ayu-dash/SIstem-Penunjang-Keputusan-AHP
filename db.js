const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'spk_ahp.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS kriteria (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS alternatif (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sub_kriteria (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS perbandingan_kriteria (
        kriteria_id_1 INTEGER NOT NULL,
        kriteria_id_2 INTEGER NOT NULL,
        nilai         REAL NOT NULL DEFAULT 1,
        FOREIGN KEY (kriteria_id_1) REFERENCES kriteria(id) ON DELETE CASCADE,
        FOREIGN KEY (kriteria_id_2) REFERENCES kriteria(id) ON DELETE CASCADE,
        PRIMARY KEY (kriteria_id_1, kriteria_id_2)
    );

    CREATE TABLE IF NOT EXISTS perbandingan_subkriteria (
        kriteria_id INTEGER NOT NULL,
        sub_id_1    INTEGER NOT NULL,
        sub_id_2    INTEGER NOT NULL,
        nilai       REAL NOT NULL DEFAULT 1,
        FOREIGN KEY (kriteria_id) REFERENCES kriteria(id) ON DELETE CASCADE,
        FOREIGN KEY (sub_id_1)    REFERENCES sub_kriteria(id) ON DELETE CASCADE,
        FOREIGN KEY (sub_id_2)    REFERENCES sub_kriteria(id) ON DELETE CASCADE,
        PRIMARY KEY (kriteria_id, sub_id_1, sub_id_2)
    );

    CREATE TABLE IF NOT EXISTS penilaian (
        alternatif_id INTEGER NOT NULL,
        kriteria_id   INTEGER NOT NULL,
        sub_id        INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (alternatif_id) REFERENCES alternatif(id) ON DELETE CASCADE,
        FOREIGN KEY (kriteria_id)   REFERENCES kriteria(id)   ON DELETE CASCADE,
        FOREIGN KEY (sub_id)        REFERENCES sub_kriteria(id) ON DELETE CASCADE,
        PRIMARY KEY (alternatif_id, kriteria_id)
    );
`);

// Auto-seed default sub-criteria if empty
const count = db.prepare('SELECT COUNT(*) AS cnt FROM sub_kriteria').get().cnt;
if (count === 0) {
    const insert = db.prepare('INSERT INTO sub_kriteria (nama) VALUES (?)');
    insert.run('Baik');
    insert.run('Cukup Baik');
    insert.run('Cukup Kurang');
    insert.run('Kurang');
}


console.log('✦ Database ready →', DB_PATH);
module.exports = db;
