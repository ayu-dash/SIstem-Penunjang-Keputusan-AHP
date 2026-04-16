const express = require('express');
const router = express.Router();
const db = require('../db');

const stmts = {
    getAllKriteria:  db.prepare('SELECT * FROM kriteria ORDER BY id'),
    insertKriteria: db.prepare('INSERT INTO kriteria (nama, sifat, bobot) VALUES (?, ?, ?)'),
    updateKriteria: db.prepare('UPDATE kriteria SET nama = ?, sifat = ?, bobot = ? WHERE id = ?'),
    deleteKriteria: db.prepare('DELETE FROM kriteria WHERE id = ?'),

    getAllAlternatif:  db.prepare('SELECT * FROM alternatif ORDER BY id'),
    insertAlternatif: db.prepare('INSERT INTO alternatif (nama) VALUES (?)'),
    updateAlternatif: db.prepare('UPDATE alternatif SET nama = ? WHERE id = ?'),
    deleteAlternatif: db.prepare('DELETE FROM alternatif WHERE id = ?'),

    getAllNilai:   db.prepare('SELECT * FROM nilai ORDER BY alternatif_id, kriteria_id'),
    upsertNilai:  db.prepare(`
        INSERT INTO nilai (alternatif_id, kriteria_id, nilai)
        VALUES (?, ?, ?)
        ON CONFLICT(alternatif_id, kriteria_id)
        DO UPDATE SET nilai = excluded.nilai
    `),
};

router.get('/data', (req, res) => {
    const kriteria   = stmts.getAllKriteria.all();
    const alternatif = stmts.getAllAlternatif.all();
    const nilaiRows  = stmts.getAllNilai.all();

    const nilai = {};
    nilaiRows.forEach(row => {
        nilai[`${row.alternatif_id}-${row.kriteria_id}`] = row.nilai;
    });

    res.json({ kriteria, alternatif, nilai });
});

router.post('/kriteria', (req, res) => {
    const { nama = '', sifat = 'benefit', bobot = 0 } = req.body;
    const result = stmts.insertKriteria.run(nama, sifat, bobot);
    res.json({ id: result.lastInsertRowid, nama, sifat, bobot });
});

router.put('/kriteria/:id', (req, res) => {
    const { nama, sifat, bobot } = req.body;
    stmts.updateKriteria.run(nama, sifat, bobot, req.params.id);
    res.json({ ok: true });
});

router.delete('/kriteria/:id', (req, res) => {
    stmts.deleteKriteria.run(req.params.id);
    res.json({ ok: true });
});

router.post('/alternatif', (req, res) => {
    const { nama = '' } = req.body;
    const result = stmts.insertAlternatif.run(nama);
    res.json({ id: result.lastInsertRowid, nama });
});

router.put('/alternatif/:id', (req, res) => {
    const { nama } = req.body;
    stmts.updateAlternatif.run(nama, req.params.id);
    res.json({ ok: true });
});

router.delete('/alternatif/:id', (req, res) => {
    stmts.deleteAlternatif.run(req.params.id);
    res.json({ ok: true });
});

router.put('/nilai', (req, res) => {
    const { values } = req.body;
    if (!Array.isArray(values)) return res.status(400).json({ error: 'values must be an array' });

    const upsertMany = db.transaction((items) => {
        for (const item of items) {
            stmts.upsertNilai.run(item.alternatif_id, item.kriteria_id, item.nilai);
        }
    });

    upsertMany(values);
    res.json({ ok: true, count: values.length });
});

module.exports = router;
