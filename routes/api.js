const express = require('express');
const router = express.Router();
const db = require('../db');

const stmts = {
    getAllKriteria:  db.prepare('SELECT * FROM kriteria ORDER BY id'),
    insertKriteria: db.prepare('INSERT INTO kriteria (nama) VALUES (?)'),
    updateKriteria: db.prepare('UPDATE kriteria SET nama = ? WHERE id = ?'),
    deleteKriteria: db.prepare('DELETE FROM kriteria WHERE id = ?'),

    getAllAlternatif:  db.prepare('SELECT * FROM alternatif ORDER BY id'),
    insertAlternatif: db.prepare('INSERT INTO alternatif (nama) VALUES (?)'),
    updateAlternatif: db.prepare('UPDATE alternatif SET nama = ? WHERE id = ?'),
    deleteAlternatif: db.prepare('DELETE FROM alternatif WHERE id = ?'),

    getAllSubKriteria:  db.prepare('SELECT * FROM sub_kriteria ORDER BY id'),
    insertSubKriteria: db.prepare('INSERT INTO sub_kriteria (nama) VALUES (?)'),
    updateSubKriteria: db.prepare('UPDATE sub_kriteria SET nama = ? WHERE id = ?'),
    deleteSubKriteria: db.prepare('DELETE FROM sub_kriteria WHERE id = ?'),

    getAllPerbandingan:    db.prepare('SELECT * FROM perbandingan_kriteria'),
    upsertPerbandingan:   db.prepare(`INSERT INTO perbandingan_kriteria (kriteria_id_1, kriteria_id_2, nilai) VALUES (?, ?, ?) ON CONFLICT(kriteria_id_1, kriteria_id_2) DO UPDATE SET nilai = excluded.nilai`),

    getAllPerbandinganSub: db.prepare('SELECT * FROM perbandingan_subkriteria'),
    upsertPerbandinganSub: db.prepare(`INSERT INTO perbandingan_subkriteria (kriteria_id, sub_id_1, sub_id_2, nilai) VALUES (?, ?, ?, ?) ON CONFLICT(kriteria_id, sub_id_1, sub_id_2) DO UPDATE SET nilai = excluded.nilai`),

    getAllPenilaian:  db.prepare('SELECT * FROM penilaian ORDER BY alternatif_id, kriteria_id'),
    upsertPenilaian: db.prepare(`INSERT INTO penilaian (alternatif_id, kriteria_id, sub_id) VALUES (?, ?, ?) ON CONFLICT(alternatif_id, kriteria_id) DO UPDATE SET sub_id = excluded.sub_id`),
};

// GET all data
router.get('/data', (req, res) => {
    const kriteria     = stmts.getAllKriteria.all();
    const alternatif   = stmts.getAllAlternatif.all();
    const subKriteria  = stmts.getAllSubKriteria.all();
    const perbandingan = stmts.getAllPerbandingan.all();
    const perbandinganSub = stmts.getAllPerbandinganSub.all();
    const penilaianRows   = stmts.getAllPenilaian.all();

    const penilaian = {};
    penilaianRows.forEach(row => {
        penilaian[`${row.alternatif_id}-${row.kriteria_id}`] = row.sub_id;
    });

    res.json({ kriteria, alternatif, perbandingan, perbandinganSub, penilaian, subKriteria });
});

// Kriteria CRUD
router.post('/kriteria', (req, res) => {
    const { nama = '' } = req.body;
    const result = stmts.insertKriteria.run(nama);
    res.json({ id: result.lastInsertRowid, nama });
});

router.put('/kriteria/:id', (req, res) => {
    const { nama } = req.body;
    stmts.updateKriteria.run(nama, req.params.id);
    res.json({ ok: true });
});

router.delete('/kriteria/:id', (req, res) => {
    stmts.deleteKriteria.run(req.params.id);
    res.json({ ok: true });
});

// Alternatif CRUD
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

// Perbandingan kriteria
router.put('/perbandingan', (req, res) => {
    const { perbandingan } = req.body;
    if (!Array.isArray(perbandingan)) return res.status(400).json({ error: 'perbandingan must be an array' });
    try {
        const upsertMany = db.transaction((items) => {
            for (const item of items) {
                stmts.upsertPerbandingan.run(item.kriteria_id_1, item.kriteria_id_2, item.nilai);
            }
        });
        upsertMany(perbandingan);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Perbandingan sub-kriteria
router.put('/perbandingan-sub', (req, res) => {
    const { perbandingan } = req.body;
    if (!Array.isArray(perbandingan)) return res.status(400).json({ error: 'perbandingan must be an array' });
    try {
        const upsertMany = db.transaction((items) => {
            for (const item of items) {
                stmts.upsertPerbandinganSub.run(item.kriteria_id, item.sub_id_1, item.sub_id_2, item.nilai);
            }
        });
        upsertMany(perbandingan);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Penilaian alternatif
router.put('/penilaian', (req, res) => {
    const { penilaian } = req.body;
    if (!Array.isArray(penilaian)) return res.status(400).json({ error: 'penilaian must be an array' });
    try {
        const upsertMany = db.transaction((items) => {
            for (const item of items) {
                stmts.upsertPenilaian.run(item.alternatif_id, item.kriteria_id, item.sub_id);
            }
        });
        upsertMany(penilaian);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sub-kriteria CRUD
router.post('/sub-kriteria', (req, res) => {
    const { nama = '' } = req.body;
    const result = stmts.insertSubKriteria.run(nama);
    res.json({ id: result.lastInsertRowid, nama });
});

router.put('/sub-kriteria/:id', (req, res) => {
    const { nama } = req.body;
    stmts.updateSubKriteria.run(nama, req.params.id);
    res.json({ ok: true });
});

router.delete('/sub-kriteria/:id', (req, res) => {
    stmts.deleteSubKriteria.run(req.params.id);
    res.json({ ok: true });
});

module.exports = router;
