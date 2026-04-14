/**
 * Fungsi untuk memperbarui Matriks Keputusan berdasarkan input 
 * pada tabel Kriteria dan tabel Alternatif secara otomatis.
 */
const updateMatrix = () => {
    const kriteriaRows = document.querySelectorAll('#tableKriteria tbody tr');
    const alternatifRows = document.querySelectorAll('#tableAlternatif tbody tr');
    const matrixHead = document.querySelector('#tableMatrix thead tr');
    const matrixBody = document.querySelector('#tableMatrix tbody');

    // Jika elemen tabel belum dimuat, hentikan fungsi
    if (!matrixHead || !matrixBody) return;

    // Simpan nilai input yang sudah ada agar tidak hilang saat re-render
    const existingValues = {};
    document.querySelectorAll('#tableMatrix tbody tr').forEach((tr, altIdx) => {
        tr.querySelectorAll('input').forEach((input, critIdx) => {
            existingValues[`${altIdx}-${critIdx}`] = input.value;
        });
    });

    // 1. Update Header Matriks (Kriteria)
    matrixHead.innerHTML = '<th>Alternatif / Kriteria</th>';
    let kriteriaCount = 0;
    kriteriaRows.forEach((row, index) => {
        let name = row.cells[0].querySelector('input').value || `C${index + 1}`;
        matrixHead.insertAdjacentHTML('beforeend', `<th class="text-center">${name}</th>`);
        kriteriaCount++;
    });

    // 2. Update Baris Matriks (Alternatif)
    matrixBody.innerHTML = '';
    alternatifRows.forEach((row, altIdx) => {
        let altName = row.cells[0].querySelector('input').value || `A${altIdx + 1}`;
        let rowHtml = `<tr><td><strong>${altName}</strong></td>`;
        
        for (let critIdx = 0; critIdx < kriteriaCount; critIdx++) {
            let val = existingValues[`${altIdx}-${critIdx}`] || '';
            rowHtml += `<td><input type="number" class="form-control form-control-sm text-center" value="${val}"></td>`;
        }
        rowHtml += `</tr>`;
        matrixBody.insertAdjacentHTML('beforeend', rowHtml);
    });

    // Picu hitung normalisasi setiap kali struktur matriks berubah
    hitungNormalisasi();
};

/**
 * Fungsi untuk menghitung Matriks Normalisasi (R) secara real-time.
 */
const hitungNormalisasi = () => {
    const kRows = document.querySelectorAll('#tableKriteria tbody tr');
    const mRows = document.querySelectorAll('#tableMatrix tbody tr');
    const nHead = document.querySelector('#tableNormalisasi thead tr');
    const nBody = document.querySelector('#tableNormalisasi tbody');

    // Proteksi jika elemen tabel normalisasi tidak ditemukan
    if (!nHead || !nBody) return;

    // 1. Ambil Sifat Kriteria (Benefit/Cost)
    let sifat = [];
    kRows.forEach(row => {
        const select = row.cells[1].querySelector('select');
        if (select) sifat.push(select.value);
    });

    // 2. Ambil Data dari Matriks Keputusan
    let matriks = [];
    mRows.forEach(row => {
        let rData = [];
        row.querySelectorAll('input').forEach(input => rData.push(parseFloat(input.value) || 0));
        matriks.push(rData);
    });

    // Jika matriks kosong, bersihkan tabel normalisasi dan keluar
    if (matriks.length === 0 || matriks[0].length === 0) {
        nBody.innerHTML = '';
        return;
    }

    // 3. Sinkronisasi Header dari Matriks Keputusan
    nHead.innerHTML = document.querySelector('#tableMatrix thead tr').innerHTML;

    // 4. Hitung Normalisasi
    nBody.innerHTML = '';
    matriks.forEach((row, i) => {
        const altInput = document.querySelectorAll('#tableAlternatif tbody tr')[i]?.cells[0].querySelector('input');
        let altName = altInput?.value || `A${i+1}`;
        
        let rowHtml = `<tr><td><strong>${altName}</strong></td>`;
        
        row.forEach((val, j) => {
            let colValues = matriks.map(r => r[j]);
            let maxCol = Math.max(...colValues);
            let minCol = Math.min(...colValues);
            let r_value = 0;

            if (val > 0) {
                if (sifat[j] === 'benefit') {
                    r_value = val / maxCol;
                } else {
                    r_value = minCol / val;
                }
            }
            rowHtml += `<td class="text-center font-monospace">${r_value.toFixed(2)}</td>`;
        });

        rowHtml += `</tr>`;
        nBody.insertAdjacentHTML('beforeend', rowHtml);
    });
};

/**
 * Fungsi Final untuk menghitung Nilai Preferensi (V) dan Perangkingan.
 */
function hitungSAW() {
    const kRows = document.querySelectorAll('#tableKriteria tbody tr');
    const aRows = document.querySelectorAll('#tableAlternatif tbody tr');
    const nRows = document.querySelectorAll('#tableNormalisasi tbody tr');

    let bobot = [];
    kRows.forEach(row => {
        // Konversi bobot ke desimal (misal 30 menjadi 0.3)
        let bVal = parseFloat(row.cells[2].querySelector('input').value) || 0;
        bobot.push(bVal / 100);
    });

    // Ambil nilai dari tabel normalisasi (R)
    let hasil = [];
    nRows.forEach((row, i) => {
        let altName = row.cells[0].innerText;
        let v = 0;
        
        const cells = row.querySelectorAll('td');
        for (let j = 1; j < cells.length; j++) {
            let r_ij = parseFloat(cells[j].innerText) || 0;
            v += r_ij * (bobot[j-1] || 0);
        }
        
        hasil.push({ nama: altName, v: v.toFixed(4) });
    });

    if (hasil.length === 0) return alert("Lengkapi data matriks terlebih dahulu!");

    // Urutkan berdasarkan nilai tertinggi
    hasil.sort((a, b) => b.v - a.v);

    // Tampilkan pada Tabel Hasil
    const tbodyHasil = document.querySelector('#tableHasil tbody');
    if (tbodyHasil) {
        tbodyHasil.innerHTML = '';
        hasil.forEach((h, i) => {
            const isRank1 = i === 0 ? 'rank-1' : '';
            tbodyHasil.insertAdjacentHTML('beforeend', `
                <tr class="${isRank1}">
                    <td>${i + 1}</td>
                    <td>${h.nama}</td>
                    <td>${h.v}</td>
                </tr>
            `);
        });
        document.getElementById('hasilSection').style.display = 'block';
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

// --- Event Listeners ---

// Tombol Tambah Kriteria
document.getElementById('addKriteria').onclick = () => {
    const tr = `<tr>
        <td><input class="form-control" type="text" placeholder="Kriteria"></td>
        <td><select class="form-select"><option value="cost">Cost</option><option value="benefit">Benefit</option></select></td>
        <td style="width: 100px"><input class="form-control" type="number" value="0"></td>
        <td><button class="btn btn-outline-danger btn-sm delete-row">×</button></td>
    </tr>`;
    document.querySelector('#tableKriteria tbody').insertAdjacentHTML('beforeend', tr);
    updateMatrix();
};

// Tombol Tambah Alternatif
document.getElementById('addAlternatif').onclick = () => {
    const tr = `<tr>
        <td><input class="form-control" type="text" placeholder="Nama Properti"></td>
        <td class="text-end"><button class="btn btn-outline-danger btn-sm delete-row">×</button></td>
    </tr>`;
    document.querySelector('#tableAlternatif tbody').insertAdjacentHTML('beforeend', tr);
    updateMatrix();
};

// Hapus Baris (Delegasi Event)
document.addEventListener('click', e => {
    if (e.target.classList.contains('delete-row')) {
        e.target.closest('tr').remove();
        updateMatrix();
    }
});

// Otomatisasi Input
document.querySelector('.container').addEventListener('input', e => {
    // Jika input di Kriteria atau Alternatif, update struktur matriks
    if (e.target.closest('#tableKriteria') || e.target.closest('#tableAlternatif')) {
        updateMatrix();
    }
    // Jika input nilai di Matriks Keputusan, update normalisasi saja
    if (e.target.closest('#tableMatrix')) {
        hitungNormalisasi();
    }
});

// Jalankan saat pertama kali load
window.onload = updateMatrix;