const db = require('./db');

try {
    // Clear old data
    db.exec('DELETE FROM penilaian');
    db.exec('DELETE FROM perbandingan_kriteria');
    db.exec('DELETE FROM perbandingan_subkriteria');
    db.exec('DELETE FROM alternatif');
    db.exec('DELETE FROM kriteria');
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('kriteria', 'alternatif')");

    // 1. Insert Kriteria
    const kriteria = [
        { id: 1, nama: 'Maintainability' },
        { id: 2, nama: 'Dependability' },
        { id: 3, nama: 'Efisiensi' },
        { id: 4, nama: 'Usability' }
    ];
    const insertKrit = db.prepare('INSERT INTO kriteria (id, nama) VALUES (?, ?)');
    kriteria.forEach(k => insertKrit.run(k.id, k.nama));

    // 2. Insert Alternatif
    const alternatif = [
        { id: 1, nama: 'Coretax' },
        { id: 2, nama: 'IGRS' },
        { id: 3, nama: 'Sertifikasi K3' }
    ];
    const insertAlt = db.prepare('INSERT INTO alternatif (id, nama) VALUES (?, ?)');
    alternatif.forEach(a => insertAlt.run(a.id, a.nama));

    // 3. Insert Perbandingan Berpasangan Kriteria
    // Saaty values for upper-triangle:
    // Maintainability (1) vs Dependability (2) = 5
    // Maintainability (1) vs Efisiensi (3) = 3
    // Maintainability (1) vs Usability (4) = 5
    // Dependability (2) vs Efisiensi (3) = 1/3 (0.3333333333333333) -> we insert 0.3333333333333333. Wait, let's store 0.3333333333333333
    // Dependability (2) vs Usability (4) = 3
    // Efisiensi (3) vs Usability (4) = 5
    const perbandinganKrit = [
        { k1: 1, k2: 2, v: 5 },
        { k1: 1, k2: 3, v: 3 },
        { k1: 1, k2: 4, v: 5 },
        { k1: 2, k2: 3, v: 1/3 },
        { k1: 2, k2: 4, v: 3 },
        { k1: 3, k2: 4, v: 5 }
    ];
    const insertPerbKrit = db.prepare('INSERT INTO perbandingan_kriteria (kriteria_id_1, kriteria_id_2, nilai) VALUES (?, ?, ?)');
    perbandinganKrit.forEach(p => insertPerbKrit.run(p.k1, p.k2, p.v));

    // 4. Insert Perbandingan Berpasangan Sub-kriteria (Same for all kriteria 1 to 4)
    // Sub-kriteria scale: 1=Baik, 2=Cukup Baik, 3=Cukup Kurang, 4=Kurang
    // Baik (1) vs Cukup Baik (2) = 2
    // Baik (1) vs Cukup Kurang (3) = 4
    // Baik (1) vs Kurang (4) = 7
    // Cukup Baik (2) vs Cukup Kurang (3) = 2
    // Cukup Baik (2) vs Kurang (4) = 5
    // Cukup Kurang (3) vs Kurang (4) = 3
    const insertSubStmt = db.prepare('INSERT INTO perbandingan_subkriteria (kriteria_id, sub_id_1, sub_id_2, nilai) VALUES (?, ?, ?, ?)');

    const subPerb = [
        { s1: 1, s2: 2, v: 2 },
        { s1: 1, s2: 3, v: 4 },
        { s1: 1, s2: 4, v: 7 },
        { s1: 2, s2: 3, v: 2 },
        { s1: 2, s2: 4, v: 5 },
        { s1: 3, s2: 4, v: 3 }
    ];

    for (let kid = 1; kid <= 4; kid++) {
        subPerb.forEach(p => {
            insertSubStmt.run(kid, p.s1, p.s2, p.v);
        });
    }

    // 5. Insert Penilaian Alternatif
    // Coretax (1): Cukup Kurang (3), Cukup Kurang (3), Cukup Baik (2), Kurang (4)
    // IGRS (2): Cukup Baik (2), Cukup Baik (2), Cukup Baik (2), Cukup Kurang (3)
    // Sertifikasi K3 (3): Baik (1), Baik (1), Cukup Baik (2), Cukup Baik (2)
    const penilaian = [
        // Coretax
        { aid: 1, kid: 1, sub: 3 },
        { aid: 1, kid: 2, sub: 3 },
        { aid: 1, kid: 3, sub: 2 },
        { aid: 1, kid: 4, sub: 4 },
        // IGRS
        { aid: 2, kid: 1, sub: 2 },
        { aid: 2, kid: 2, sub: 2 },
        { aid: 2, kid: 3, sub: 2 },
        { aid: 2, kid: 4, sub: 3 },
        // Sertifikasi K3
        { aid: 3, kid: 1, sub: 1 },
        { aid: 3, kid: 2, sub: 1 },
        { aid: 3, kid: 3, sub: 2 },
        { aid: 3, kid: 4, sub: 2 }
    ];
    const insertPenilaian = db.prepare('INSERT INTO penilaian (alternatif_id, kriteria_id, sub_id) VALUES (?, ?, ?)');
    penilaian.forEach(p => insertPenilaian.run(p.aid, p.kid, p.sub));

    console.log('✦ Database successfully seeded with AHP murni data!');
} catch (err) {
    console.error('Seed error:', err);
}
