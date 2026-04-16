; (() => {
    'use strict';

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        kriteria: { table: '#tableKriteria', tbody: '#tableKriteria tbody', btn: '#addKriteria' },
        alternatif: { table: '#tableAlternatif', tbody: '#tableAlternatif tbody', btn: '#addAlternatif' },
        matrix: { head: '#tableMatrix thead tr', tbody: '#tableMatrix tbody' },
        normalisasi: { head: '#tableNormalisasi thead tr', tbody: '#tableNormalisasi tbody' },
        perangkingan: { head: '#tablePerangkingan thead tr', tbody: '#tablePerangkingan tbody' },
        hasil: { section: '#hasilSection', tbody: '#tableHasil tbody' },
        bobot: { indicator: '#bobotIndicator', value: '#bobotValue' },
        btnHitung: '#btnHitung'
    };

    let state = {
        kriteria: [],
        alternatif: [],
        nilai: {}
    };

    async function api(method, url, body = null) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`/api${url}`, opts);
        return res.json();
    }

    function debounce(fn, ms = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    function esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderKriteria() {
        const tbody = $(dom.kriteria.tbody);
        if (!tbody) return;

        if (state.kriteria.length === 0) {
            tbody.innerHTML = '';
            updateBobotIndicator();
            return;
        }

        tbody.innerHTML = state.kriteria.map(k => `
            <tr data-id="${k.id}">
                <td><input class="form-input krit-nama" type="text" value="${esc(k.nama)}" placeholder="Nama kriteria"></td>
                <td>
                    <select class="form-select krit-sifat">
                        <option value="benefit"${k.sifat === 'benefit' ? ' selected' : ''}>Benefit</option>
                        <option value="cost"${k.sifat === 'cost' ? ' selected' : ''}>Cost</option>
                    </select>
                </td>
                <td><input class="form-input input-sm krit-bobot" type="number" value="${k.bobot}" min="0" max="100"></td>
                <td class="text-end"><button class="btn btn--delete delete-kriteria" title="Hapus">×</button></td>
            </tr>
        `).join('');

        updateBobotIndicator();
    }

    function renderAlternatif() {
        const tbody = $(dom.alternatif.tbody);
        if (!tbody) return;

        if (state.alternatif.length === 0) {
            tbody.innerHTML = '';
            return;
        }

        tbody.innerHTML = state.alternatif.map(a => `
            <tr data-id="${a.id}">
                <td><input class="form-input alt-nama" type="text" value="${esc(a.nama)}" placeholder="Nama properti"></td>
                <td class="text-end"><button class="btn btn--delete delete-alternatif" title="Hapus">×</button></td>
            </tr>
        `).join('');
    }

    function updateBobotIndicator() {
        const total = state.kriteria.reduce((sum, k) => sum + (k.bobot || 0), 0);
        const el = $(dom.bobot.indicator);
        const valEl = $(dom.bobot.value);
        if (!el || !valEl) return total;

        valEl.textContent = `${total}%`;
        el.classList.remove('valid', 'invalid');
        if (total === 100) {
            el.classList.add('valid');
        } else if (total > 0) {
            el.classList.add('invalid');
        }
        return total;
    }

    function renderMatrix() {
        const matrixHead = $(dom.matrix.head);
        const matrixBody = $(dom.matrix.tbody);
        if (!matrixHead || !matrixBody) return;

        let headHtml = '<th>Alternatif / Kriteria</th>';
        state.kriteria.forEach(k => {
            headHtml += `<th class="text-center">${esc(k.nama || `C${k.id}`)}</th>`;
        });
        matrixHead.innerHTML = headHtml;

        if (state.alternatif.length === 0 || state.kriteria.length === 0) {
            matrixBody.innerHTML = `<tr><td colspan="${state.kriteria.length + 1}">
                <div class="empty-state">
                    <div class="empty-state__icon">📋</div>
                    Tambahkan kriteria dan alternatif untuk mulai
                </div>
            </td></tr>`;
            return;
        }

        let bodyHtml = '';
        state.alternatif.forEach(a => {
            bodyHtml += `<tr data-alt-id="${a.id}"><td><strong>${esc(a.nama || `A${a.id}`)}</strong></td>`;
            state.kriteria.forEach(k => {
                const key = `${a.id}-${k.id}`;
                const val = state.nilai[key] || '';
                bodyHtml += `<td><input type="number" class="form-input input-sm matrix-input" 
                    data-alt="${a.id}" data-crit="${k.id}" value="${val}" min="0"></td>`;
            });
            bodyHtml += '</tr>';
        });
        matrixBody.innerHTML = bodyHtml;
    }

    function hitungNormalisasi() {
        const nHead = $(dom.normalisasi.head);
        const nBody = $(dom.normalisasi.tbody);
        if (!nHead || !nBody) return null;

        if (state.kriteria.length === 0 || state.alternatif.length === 0) {
            nHead.innerHTML = '<th>Alternatif / Kriteria</th>';
            nBody.innerHTML = '';
            return null;
        }

        const matriks = state.alternatif.map(a =>
            state.kriteria.map(k => state.nilai[`${a.id}-${k.id}`] || 0)
        );

        const hasValues = matriks.some(row => row.some(v => v > 0));
        if (!hasValues) {
            nHead.innerHTML = '<th>Alternatif / Kriteria</th>';
            nBody.innerHTML = '';
            return null;
        }

        let headHtml = '<th>Alternatif / Kriteria</th>';
        state.kriteria.forEach(k => {
            headHtml += `<th class="text-center">${esc(k.nama || `C${k.id}`)}</th>`;
        });
        nHead.innerHTML = headHtml;

        const normalisasi = [];
        let bodyHtml = '';

        matriks.forEach((row, i) => {
            const alt = state.alternatif[i];
            bodyHtml += `<tr><td><strong>${esc(alt.nama || `A${alt.id}`)}</strong></td>`;

            const normRow = [];
            row.forEach((val, j) => {
                const colValues = matriks.map(r => r[j]);
                const maxCol = Math.max(...colValues);
                const minCol = Math.min(...colValues.filter(v => v > 0));
                let rValue = 0;

                if (val > 0) {
                    rValue = state.kriteria[j].sifat === 'benefit'
                        ? val / maxCol
                        : (minCol || 0) / val;
                }
                normRow.push(rValue);
                bodyHtml += `<td class="text-center text-mono">${rValue.toFixed(4)}</td>`;
            });
            normalisasi.push(normRow);
            bodyHtml += '</tr>';
        });

        nBody.innerHTML = bodyHtml;
        hitungPerangkingan(normalisasi);
        return normalisasi;
    }

    function hitungPerangkingan(normalisasi) {
        const pHead = $(dom.perangkingan.head);
        const pBody = $(dom.perangkingan.tbody);
        if (!pHead || !pBody) return;

        if (!normalisasi || normalisasi.length === 0) {
            pBody.innerHTML = '';
            return;
        }

        const bobot = state.kriteria.map(k => (k.bobot || 0) / 100);

        let headHtml = '<th>Alternatif / Kriteria</th>';
        state.kriteria.forEach(k => {
            headHtml += `<th class="text-center">${esc(k.nama || `C${k.id}`)}</th>`;
        });
        headHtml += '<th class="text-center">Total (V)</th>';
        pHead.innerHTML = headHtml;

        let bodyHtml = '';
        normalisasi.forEach((row, i) => {
            const alt = state.alternatif[i];
            bodyHtml += `<tr><td><strong>${esc(alt.nama || `A${alt.id}`)}</strong></td>`;

            let totalV = 0;
            row.forEach((rVal, j) => {
                const vCell = rVal * (bobot[j] || 0);
                totalV += vCell;
                bodyHtml += `<td class="text-center text-mono">${vCell.toFixed(4)}</td>`;
            });

            bodyHtml += `<td class="text-center text-mono" style="font-weight:700; color: var(--accent-teal);">${totalV.toFixed(4)}</td>`;
            bodyHtml += '</tr>';
        });

        pBody.innerHTML = bodyHtml;
    }

    function renderAll() {
        renderKriteria();
        renderAlternatif();
        renderMatrix();
        hitungNormalisasi();
    }

    function hitungSAW() {
        if (state.kriteria.length === 0) return alert('Tambahkan minimal 1 kriteria!');
        if (state.alternatif.length === 0) return alert('Tambahkan minimal 1 alternatif!');

        const totalBobot = state.kriteria.reduce((s, k) => s + (k.bobot || 0), 0);
        if (totalBobot !== 100) return alert(`Total bobot harus 100%, saat ini: ${totalBobot}%`);

        const hasEmpty = state.alternatif.some(a =>
            state.kriteria.some(k => !state.nilai[`${a.id}-${k.id}`] || state.nilai[`${a.id}-${k.id}`] === 0)
        );
        if (hasEmpty) return alert('Lengkapi semua nilai pada Matriks Keputusan! (Tidak boleh kosong atau 0)');

        const normalisasi = hitungNormalisasi();
        if (!normalisasi) return alert('Gagal menghitung normalisasi!');

        const bobot = state.kriteria.map(k => (k.bobot || 0) / 100);

        const hasil = normalisasi.map((row, i) => {
            const alt = state.alternatif[i];
            const v = row.reduce((sum, rVal, j) => sum + rVal * (bobot[j] || 0), 0);
            return { nama: alt.nama || `A${alt.id}`, v };
        });

        hasil.sort((a, b) => b.v - a.v);

        const tbody = $(dom.hasil.tbody);
        if (!tbody) return;

        tbody.innerHTML = hasil.map((h, i) => {
            const cls = i === 0 ? ' class="rank-1"' : '';
            return `<tr${cls}>
                <td class="text-center"><span class="rank-badge">${i + 1}</span></td>
                <td><strong>${esc(h.nama)}</strong></td>
                <td class="text-center text-mono">${h.v.toFixed(4)}</td>
            </tr>`;
        }).join('');

        const section = $(dom.hasil.section);
        if (section) {
            section.classList.add('visible');
            setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        }
    }

    async function addKriteria() {
        const data = await api('POST', '/kriteria', { nama: '', sifat: 'benefit', bobot: 0 });
        state.kriteria.push(data);
        renderAll();
    }

    async function addAlternatif() {
        const data = await api('POST', '/alternatif', { nama: '' });
        state.alternatif.push(data);
        renderAll();
    }

    async function deleteKriteria(id) {
        await api('DELETE', `/kriteria/${id}`);
        state.kriteria = state.kriteria.filter(k => k.id !== id);
        Object.keys(state.nilai).forEach(key => {
            if (key.endsWith(`-${id}`)) delete state.nilai[key];
        });
        renderAll();
    }

    async function deleteAlternatif(id) {
        await api('DELETE', `/alternatif/${id}`);
        state.alternatif = state.alternatif.filter(a => a.id !== id);
        Object.keys(state.nilai).forEach(key => {
            if (key.startsWith(`${id}-`)) delete state.nilai[key];
        });
        renderAll();
    }

    const saveKriteria = debounce(async (id) => {
        const k = state.kriteria.find(k => k.id === id);
        if (!k) return;
        await api('PUT', `/kriteria/${id}`, { nama: k.nama, sifat: k.sifat, bobot: k.bobot });
    }, 400);

    const saveAlternatif = debounce(async (id) => {
        const a = state.alternatif.find(a => a.id === id);
        if (!a) return;
        await api('PUT', `/alternatif/${id}`, { nama: a.nama });
    }, 400);

    const saveNilai = debounce(async () => {
        const values = [];
        for (const [key, val] of Object.entries(state.nilai)) {
            const [altId, critId] = key.split('-').map(Number);
            if (val > 0) values.push({ alternatif_id: altId, kriteria_id: critId, nilai: val });
        }
        if (values.length > 0) {
            await api('PUT', '/nilai', { values });
        }
    }, 500);

    $(dom.kriteria.btn)?.addEventListener('click', addKriteria);

    $(dom.alternatif.btn)?.addEventListener('click', addAlternatif);

    document.addEventListener('click', e => {
        if (e.target.classList.contains('delete-kriteria')) {
            const id = Number(e.target.closest('tr').dataset.id);
            deleteKriteria(id);
        }
        if (e.target.classList.contains('delete-alternatif')) {
            const id = Number(e.target.closest('tr').dataset.id);
            deleteAlternatif(id);
        }
    });

    $(dom.kriteria.tbody)?.addEventListener('input', e => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const id = Number(tr.dataset.id);
        const k = state.kriteria.find(k => k.id === id);
        if (!k) return;

        if (e.target.classList.contains('krit-nama')) {
            k.nama = e.target.value;
            renderMatrix();
            hitungNormalisasi();
        }
        if (e.target.classList.contains('krit-bobot')) {
            k.bobot = parseFloat(e.target.value) || 0;
            updateBobotIndicator();
            hitungNormalisasi();
        }
        saveKriteria(id);
    });

    $(dom.kriteria.tbody)?.addEventListener('change', e => {
        if (!e.target.classList.contains('krit-sifat')) return;
        const tr = e.target.closest('tr');
        const id = Number(tr.dataset.id);
        const k = state.kriteria.find(k => k.id === id);
        if (!k) return;

        k.sifat = e.target.value;
        hitungNormalisasi();
        saveKriteria(id);
    });

    $(dom.alternatif.tbody)?.addEventListener('input', e => {
        if (!e.target.classList.contains('alt-nama')) return;
        const tr = e.target.closest('tr');
        const id = Number(tr.dataset.id);
        const a = state.alternatif.find(a => a.id === id);
        if (!a) return;

        a.nama = e.target.value;
        renderMatrix();
        hitungNormalisasi();
        saveAlternatif(id);
    });

    $(dom.matrix.tbody)?.addEventListener('input', e => {
        if (!e.target.classList.contains('matrix-input')) return;
        const altId = Number(e.target.dataset.alt);
        const critId = Number(e.target.dataset.crit);
        const val = parseFloat(e.target.value) || 0;

        state.nilai[`${altId}-${critId}`] = val;
        hitungNormalisasi();
        saveNilai();
    });

    $(dom.btnHitung)?.addEventListener('click', hitungSAW);

    async function init() {
        try {
            const data = await api('GET', '/data');
            state.kriteria = data.kriteria || [];
            state.alternatif = data.alternatif || [];
            state.nilai = data.nilai || {};
            renderAll();
        } catch (err) {
            console.error('Failed to load data:', err);
            renderAll();
        }
    }

    window.addEventListener('DOMContentLoaded', init);

})();