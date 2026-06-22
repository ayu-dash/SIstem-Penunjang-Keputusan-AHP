;(() => {
'use strict';
const $ = s => document.querySelector(s);
const RI_TABLE = [0,0,0.58,0.90,1.12,1.24,1.32,1.41,1.45,1.49];
const SAATY_OPTIONS = [1,2,3,4,5,6,7,8,9];
const SAATY_LABELS = {1:'1 - Sama penting',2:'2',3:'3 - Cukup penting',4:'4',5:'5 - Penting',6:'6',7:'7 - Sangat penting',8:'8',9:'9 - Mutlak penting'};

let state = { kriteria:[], alternatif:[], subKriteria:[], perbandingan:{}, perbandinganSub:{}, penilaian:{} };

async function api(method, url, body=null) {
    const opts = { method, headers:{'Content-Type':'application/json'} };
    if (body) opts.body = JSON.stringify(body);
    return (await fetch(`/api${url}`, opts)).json();
}
function debounce(fn, ms=400) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function esc(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// ── AHP core ──
function ahpCalc(getVal, n) {
    if (n <= 0) return { weights:[], lambdaMax:0, ci:0, cr:0, consistent:true };
    const m = [];
    for (let i=0;i<n;i++) { m[i]=[]; for (let j=0;j<n;j++) m[i][j]=getVal(i,j); }
    const cs = Array(n).fill(0);
    for (let j=0;j<n;j++) for (let i=0;i<n;i++) cs[j]+=m[i][j];
    const w = [];
    for (let i=0;i<n;i++) { let s=0; for (let j=0;j<n;j++) s+=m[i][j]/cs[j]; w[i]=s/n; }
    let lm=0; for (let j=0;j<n;j++) lm+=cs[j]*w[j];
    const ci = n>1?(lm-n)/(n-1):0;
    const ri = n<=RI_TABLE.length?RI_TABLE[n-1]:1.49;
    const cr = ri>0?ci/ri:0;
    return { weights:w, lambdaMax:lm, ci, cr, consistent: n<=2||cr<0.1 };
}

function getKritPerb(id1,id2) {
    if (id1===id2) return 1;
    const k1=`${id1}-${id2}`, k2=`${id2}-${id1}`;
    if (state.perbandingan[k1]!==undefined) return state.perbandingan[k1];
    if (state.perbandingan[k2]!==undefined) return 1/state.perbandingan[k2];
    return 1;
}
function getSubPerb(kritId,s1,s2) {
    if (s1===s2) return 1;
    const k1=`${kritId}-${s1}-${s2}`, k2=`${kritId}-${s2}-${s1}`;
    if (state.perbandinganSub[k1]!==undefined) return state.perbandinganSub[k1];
    if (state.perbandinganSub[k2]!==undefined) return 1/state.perbandinganSub[k2];
    return 1;
}

function calcKriteriaWeights() {
    const n=state.kriteria.length;
    return ahpCalc((i,j)=>getKritPerb(state.kriteria[i].id,state.kriteria[j].id), n);
}
function calcSubWeights(kritId) {
    const n=state.subKriteria.length;
    return ahpCalc((i,j)=>getSubPerb(kritId,state.subKriteria[i].id,state.subKriteria[j].id), n);
}

// ── Rendering ──
function saatySel(val, cls, attrs='') {
    let h=`<select class="matrix-select ${cls}" ${attrs}>`;
    for (const v of SAATY_OPTIONS) h+=`<option value="${v}"${v===val?' selected':''}>${SAATY_LABELS[v]}</option>`;
    h+='</select>';
    return h;
}
function fracDisplay(v) {
    if (Math.abs(v-1)<.001) return '1';
    for (let d=2;d<=9;d++) if (Math.abs(v-1/d)<.01) return `1/${d}`;
    return v>1?v.toFixed(2):v.toFixed(4);
}

function renderKriteria() {
    const tb=$('#tableKriteria tbody'); if(!tb) return;
    tb.innerHTML = state.kriteria.map(k=>`<tr data-id="${k.id}">
        <td><input class="form-input krit-nama" type="text" value="${esc(k.nama)}" placeholder="Nama kriteria"></td>
        <td class="text-end"><button class="btn btn--delete del-krit" title="Hapus">×</button></td></tr>`).join('');
}
function renderAlternatif() {
    const tb=$('#tableAlternatif tbody'); if(!tb) return;
    tb.innerHTML = state.alternatif.map(a=>`<tr data-id="${a.id}">
        <td><input class="form-input alt-nama" type="text" value="${esc(a.nama)}" placeholder="Nama alternatif"></td>
        <td class="text-end"><button class="btn btn--delete del-alt" title="Hapus">×</button></td></tr>`).join('');
}
function renderSubKriteria() {
    const tb=$('#tableSubKriteria tbody'); if(!tb) return;
    tb.innerHTML = state.subKriteria.map(s=>`<tr data-id="${s.id}">
        <td><input class="form-input sub-nama" type="text" value="${esc(s.nama)}" placeholder="Nama skala"></td>
        <td class="text-end"><button class="btn btn--delete del-sub" title="Hapus">×</button></td></tr>`).join('');
}

function renderPerbKriteria() {
    const table=$('#tablePerbandinganKriteria');
    const tb=table?.querySelector('tbody'); if(!tb) return;
    const n=state.kriteria.length;
    if(n===0){tb.innerHTML='<tr><td><div class="empty-state">Tambahkan kriteria</div></td></tr>';return;}
    const thr=table.querySelector('thead tr');
    thr.innerHTML='<th>Kriteria</th>'+state.kriteria.map(k=>`<th class="text-center">${esc(k.nama||'?')}</th>`).join('');
    let h='';
    state.kriteria.forEach((k1,i)=>{
        h+=`<tr><td><strong>${esc(k1.nama||'?')}</strong></td>`;
        state.kriteria.forEach((k2,j)=>{
            if(i===j) h+='<td class="text-center text-center-val">1</td>';
            else if(i<j){
                const v=getKritPerb(k1.id,k2.id);
                const sv=Number.isInteger(v)&&v>=1&&v<=9?v:1;
                h+=`<td class="text-center">${saatySel(sv,'perb-krit-input',`data-k1="${k1.id}" data-k2="${k2.id}"`)}</td>`;
            } else {
                h+=`<td class="text-center text-muted">${fracDisplay(getKritPerb(k1.id,k2.id))}</td>`;
            }
        });
        h+='</tr>';
    });
    tb.innerHTML=h;
    // Consistency display
    const r=calcKriteriaWeights();
    const fmt=v=>n>0?v.toFixed(4):'-';
    $('#lambdaMaxKriteria').textContent=fmt(r.lambdaMax);
    $('#ciKriteria').textContent=fmt(r.ci);
    $('#crKriteria').textContent=n>0?`${(r.cr*100).toFixed(2)}% (${r.cr.toFixed(4)})`:'-';
    const st=$('#statusKriteria');
    st.className='badge '+(r.consistent?'badge--success':'badge--danger');
    st.textContent=n<=2?'Konsisten (n≤2)':r.consistent?'Konsisten ✅':'Tidak Konsisten ❌';
    // Bobot table
    const btb=$('#tableBobotKriteria tbody');
    if(btb) btb.innerHTML=state.kriteria.map((k,i)=>`<tr><td>${esc(k.nama||'?')}</td><td class="text-center text-mono">${(r.weights[i]||0).toFixed(4)} (${((r.weights[i]||0)*100).toFixed(2)}%)</td></tr>`).join('');
}

function renderSubkriteriaTabs() {
    const tabs=$('#tabsSubkriteria'), content=$('#tabContentSubkriteria');
    if(!tabs||!content) return;
    if(state.kriteria.length===0){tabs.innerHTML='';content.innerHTML='<div class="empty-state">Tambahkan kriteria</div>';return;}
    if(state.subKriteria.length===0){tabs.innerHTML='';content.innerHTML='<div class="empty-state">Tambahkan skala penilaian (sub-kriteria)</div>';return;}
    tabs.innerHTML=state.kriteria.map((k,i)=>`<button class="tab-btn${i===0?' active':''}" data-tab="sub-${k.id}">${esc(k.nama||'?')}</button>`).join('');
    let html='';
    state.kriteria.forEach((k,idx)=>{
        const r=calcSubWeights(k.id);
        html+=`<div class="tab-panel${idx===0?' active':''}" id="sub-${k.id}">`;
        html+=`<table class="data-table"><thead><tr><th>Skala (Sub)</th>`;
        state.subKriteria.forEach(s => html+=`<th class="text-center">${esc(s.nama||'?')}</th>`);
        html+=`</tr></thead><tbody>`;
        state.subKriteria.forEach((s1,i)=>{
            html+=`<tr><td><strong>${esc(s1.nama||'?')}</strong></td>`;
            state.subKriteria.forEach((s2,j)=>{
                if(i===j) html+='<td class="text-center text-center-val">1</td>';
                else if(i<j){
                    const v=getSubPerb(k.id,s1.id,s2.id);
                    const sv=Number.isInteger(v)&&v>=1&&v<=9?v:1;
                    html+=`<td class="text-center">${saatySel(sv,'perb-sub-input',`data-kid="${k.id}" data-s1="${s1.id}" data-s2="${s2.id}"`)}</td>`;
                } else {
                    html+=`<td class="text-center text-muted">${fracDisplay(getSubPerb(k.id,s1.id,s2.id))}</td>`;
                }
            });
            html+='</tr>';
        });
        html+=`</tbody></table>`;
        // Consistency
        html+=`<div class="ahp-meta-container"><div><span class="meta-label">λ max:</span> <strong>${r.lambdaMax.toFixed(4)}</strong></div>`;
        html+=`<div><span class="meta-label">CI:</span> <strong>${r.ci.toFixed(4)}</strong></div>`;
        html+=`<div><span class="meta-label">CR:</span> <strong>${(r.cr*100).toFixed(2)}% (${r.cr.toFixed(4)})</strong></div>`;
        html+=`<div><span class="meta-label">Status:</span> <span class="badge ${r.consistent?'badge--success':'badge--danger'}">${r.consistent?'Konsisten ✅':'Tidak Konsisten ❌'}</span></div></div>`;
        // Priority table
        html+=`<table class="data-table" style="margin-top:.8rem"><thead><tr><th>Skala (Sub)</th><th class="text-center">Prioritas</th></tr></thead><tbody>`;
        state.subKriteria.forEach((s,i) => html+=`<tr><td>${esc(s.nama||'?')}</td><td class="text-center text-mono">${(r.weights[i]||0).toFixed(4)}</td></tr>`);
        html+=`</tbody></table></div>`;
    });
    content.innerHTML=html;
}

function renderPenilaian() {
    const table=$('#tablePenilaian');
    const thr=table?.querySelector('thead tr'), tb=table?.querySelector('tbody');
    if(!thr||!tb) return;
    if(!state.kriteria.length||!state.alternatif.length){tb.innerHTML='<tr><td><div class="empty-state">Tambahkan kriteria dan alternatif</div></td></tr>';return;}
    thr.innerHTML='<th>Alternatif / Kriteria</th>'+state.kriteria.map(k=>`<th class="text-center">${esc(k.nama||'?')}</th>`).join('');
    let h='';
    state.alternatif.forEach(a=>{
        h+=`<tr><td><strong>${esc(a.nama||'?')}</strong></td>`;
        state.kriteria.forEach(k=>{
            const key=`${a.id}-${k.id}`;
            const sel=state.penilaian[key]||0;
            h+=`<td class="text-center"><select class="matrix-select penilaian-input" data-aid="${a.id}" data-kid="${k.id}">`;
            h+=`<option value="0"${sel===0?' selected':''}>-- Pilih --</option>`;
            state.subKriteria.forEach(s => {
                h+=`<option value="${s.id}"${sel===s.id?' selected':''}>${esc(s.nama)}</option>`;
            });
            h+=`</select></td>`;
        });
        h+='</tr>';
    });
    tb.innerHTML=h;
}

function renderAll() {
    renderKriteria(); renderAlternatif(); renderSubKriteria(); renderPerbKriteria();
    renderSubkriteriaTabs(); renderPenilaian();
}

// ── Hitung AHP ──
function hitungAHP(isAuto = false) {
    if(!state.kriteria.length) {
        if (!isAuto) alert('Tambahkan minimal 1 kriteria!');
        return;
    }
    if(!state.alternatif.length) {
        if (!isAuto) alert('Tambahkan minimal 1 alternatif!');
        return;
    }
    if(!state.subKriteria.length) {
        if (!isAuto) alert('Tambahkan minimal 1 skala penilaian (sub-kriteria)!');
        return;
    }
    const kRes=calcKriteriaWeights();
    if(state.kriteria.length>2&&!kRes.consistent) {
        if(!isAuto && !confirm('Matriks kriteria tidak konsisten (CR≥10%). Lanjutkan?')) return;
    }
    // Check subkriteria consistency
    for(const k of state.kriteria){
        const sRes=calcSubWeights(k.id);
        if(state.subKriteria.length>2&&!sRes.consistent){
            if(!isAuto && !confirm(`Matriks sub-kriteria untuk kriteria "${k.nama}" tidak konsisten (CR≥10%). Lanjutkan?`)) return;
        }
    }
    // Check penilaian complete
    const missing=[];
    state.alternatif.forEach(a=>state.kriteria.forEach(k=>{
        if(!state.penilaian[`${a.id}-${k.id}`]) missing.push(`${a.nama||'?'} - ${k.nama||'?'}`);
    }));
    if(missing.length) {
        if (!isAuto) alert('Lengkapi penilaian:\n'+missing.slice(0,5).join('\n'));
        return;
    }

    // Sub-weights per criteria
    const subW={};
    state.kriteria.forEach(k=>{ subW[k.id]=calcSubWeights(k.id); });

    const threshold=parseFloat($('#thresholdInput')?.value)||0.65;

    // Matriks Hasil
    const mhTable=$('#tableMatriksHasil');
    const mhHead=mhTable?.querySelector('thead tr'), mhBody=mhTable?.querySelector('tbody');
    if(mhHead&&mhBody){
        mhHead.innerHTML='<th>Sub-kriteria</th>'+state.kriteria.map(k=>`<th class="text-center">${esc(k.nama||'?')}</th>`).join('');
        let h='';
        state.subKriteria.forEach((s, idx) => {
            h+=`<tr><td><strong>${esc(s.nama||'?')}</strong></td>`;
            state.kriteria.forEach((k,i)=>{
                const val=(subW[k.id].weights[idx]||0)*(kRes.weights[i]||0);
                h+=`<td class="text-center text-mono">${val.toFixed(6)}</td>`;
            });
            h+='</tr>';
        });
        mhBody.innerHTML=h;
    }

    // Detail per alternatif
    const detail=$('#detailPerhitungan');
    if(detail){
        let h='';
        state.alternatif.forEach(a=>{
            h+=`<h4 class="sub-heading">Perhitungan: ${esc(a.nama||'?')}</h4>`;
            h+=`<table class="data-table"><thead><tr><th>Kriteria</th><th class="text-center">Sub-kriteria Terpilih</th><th class="text-center">Prioritas Kriteria</th><th class="text-center">Prioritas Sub-kriteria</th><th class="text-center">Nilai</th></tr></thead><tbody>`;
            let total=0;
            state.kriteria.forEach((k,i)=>{
                const subId=state.penilaian[`${a.id}-${k.id}`]||0;
                const sObj=state.subKriteria.find(x=>x.id===subId);
                const sIdx=state.subKriteria.findIndex(x=>x.id===subId);
                const kw=kRes.weights[i]||0;
                const sw=subW[k.id].weights[sIdx]||0;
                const val=kw*sw;
                total+=val;
                h+=`<tr><td>${esc(k.nama||'?')}</td><td class="text-center">${esc(sObj?.nama||'?')}</td><td class="text-center text-mono">${kw.toFixed(4)}</td><td class="text-center text-mono">${sw.toFixed(4)}</td><td class="text-center text-mono">${val.toFixed(6)}</td></tr>`;
            });
            h+=`<tr style="font-weight:700;border-top:2px solid var(--border)"><td colspan="4">TOTAL</td><td class="text-center text-mono" style="color:var(--accent-teal)">${total.toFixed(6)}</td></tr>`;
            const layak=total>=threshold;
            h+=`<tr><td colspan="4">KEPUTUSAN (threshold ≥ ${threshold})</td><td class="text-center"><span class="badge ${layak?'badge--success':'badge--danger'}">${layak?'LAYAK ✅':'TIDAK LAYAK ❌'}</span></td></tr>`;
            h+=`</tbody></table>`;
        });
        detail.innerHTML=h;
    }

    // Final ranking
    const hasil=state.alternatif.map(a=>{
        let total=0;
        state.kriteria.forEach((k,i)=>{
            const subId=state.penilaian[`${a.id}-${k.id}`]||0;
            const sIdx=state.subKriteria.findIndex(x=>x.id===subId);
            total+=(kRes.weights[i]||0)*(subW[k.id].weights[sIdx]||0);
        });
        return { nama:a.nama||'?', total, layak:total>=threshold };
    }).sort((a,b)=>b.total-a.total);

    const htb=$('#tableHasil tbody');
    if(htb) htb.innerHTML=hasil.map((h,i)=>`<tr${i===0?' class="rank-1"':''}>
        <td class="text-center"><span class="rank-badge">${i+1}</span></td>
        <td><strong>${esc(h.nama)}</strong></td>
        <td class="text-center text-mono">${h.total.toFixed(4)}</td>
        <td class="text-center"><span class="badge ${h.layak?'badge--success':'badge--danger'}">${h.layak?'LAYAK ✅':'TIDAK LAYAK ❌'}</span></td></tr>`).join('');

    const statusAHP=$('#statusAHP');
    if(statusAHP){ statusAHP.className='badge badge--success'; statusAHP.textContent='Perhitungan Selesai'; }
    const sec=$('#hasilSection');
    if(sec){
        sec.classList.add('visible');
        if (!isAuto) {
            setTimeout(()=>sec.scrollIntoView({behavior:'smooth',block:'start'}),100);
        }
    }
}

// ── Events ──
const savePerb=debounce(async()=>{
    const p=[];
    for(const[key,val] of Object.entries(state.perbandingan)){const[k1,k2]=key.split('-').map(Number);p.push({kriteria_id_1:k1,kriteria_id_2:k2,nilai:val});}
    if(p.length) await api('PUT','/perbandingan',{perbandingan:p});
});
const savePerbSub=debounce(async()=>{
    const p=[];
    for(const[key,val] of Object.entries(state.perbandinganSub)){const[kid,s1,s2]=key.split('-').map(Number);p.push({kriteria_id:kid,sub_id_1:s1,sub_id_2:s2,nilai:val});}
    if(p.length) await api('PUT','/perbandingan-sub',{perbandingan:p});
});
const savePenilaian=debounce(async()=>{
    const p=[];
    for(const[key,val] of Object.entries(state.penilaian)){if(val>0){const[aid,kid]=key.split('-').map(Number);p.push({alternatif_id:aid,kriteria_id:kid,sub_id:val});}}
    if(p.length) await api('PUT','/penilaian',{penilaian:p});
});
const saveKrit=debounce(async(id)=>{const k=state.kriteria.find(x=>x.id===id);if(k)await api('PUT',`/kriteria/${id}`,{nama:k.nama});},400);
const saveAlt=debounce(async(id)=>{const a=state.alternatif.find(x=>x.id===id);if(a)await api('PUT',`/alternatif/${id}`,{nama:a.nama});},400);
const saveSub=debounce(async(id)=>{const s=state.subKriteria.find(x=>x.id===id);if(s)await api('PUT',`/sub-kriteria/${id}`,{nama:s.nama});},400);

$('#addKriteria')?.addEventListener('click',async()=>{const d=await api('POST','/kriteria',{nama:''});state.kriteria.push(d);renderAll();});
$('#addAlternatif')?.addEventListener('click',async()=>{const d=await api('POST','/alternatif',{nama:''});state.alternatif.push(d);renderAll();});
$('#addSubKriteria')?.addEventListener('click',async()=>{const d=await api('POST','/sub-kriteria',{nama:''});state.subKriteria.push(d);renderAll();});

document.addEventListener('click',async e=>{
    if(e.target.classList.contains('del-krit')){
        const id=Number(e.target.closest('tr').dataset.id);
        await api('DELETE',`/kriteria/${id}`);
        state.kriteria=state.kriteria.filter(k=>k.id!==id);
        for(const key of Object.keys(state.perbandingan)) if(key.includes(`${id}`)) delete state.perbandingan[key];
        for(const key of Object.keys(state.perbandinganSub)) if(key.startsWith(`${id}-`)) delete state.perbandinganSub[key];
        renderAll();
    }
    if(e.target.classList.contains('del-alt')){
        const id=Number(e.target.closest('tr').dataset.id);
        await api('DELETE',`/alternatif/${id}`);
        state.alternatif=state.alternatif.filter(a=>a.id!==id);
        renderAll();
    }
    if(e.target.classList.contains('del-sub')){
        const id=Number(e.target.closest('tr').dataset.id);
        await api('DELETE',`/sub-kriteria/${id}`);
        state.subKriteria=state.subKriteria.filter(s=>s.id!==id);
        for(const key of Object.keys(state.perbandinganSub)) if(key.includes(`-${id}-`) || key.endsWith(`-${id}`)) delete state.perbandinganSub[key];
        renderAll();
    }
    if(e.target.classList.contains('tab-btn')){
        const tabId=e.target.dataset.tab;
        e.target.parentElement.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
        e.target.classList.add('active');
        document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
        document.getElementById(tabId)?.classList.add('active');
    }
});

$('#tableKriteria tbody')?.addEventListener('input',e=>{
    if(!e.target.classList.contains('krit-nama'))return;
    const id=Number(e.target.closest('tr').dataset.id);
    const k=state.kriteria.find(x=>x.id===id);if(!k)return;
    k.nama=e.target.value;
    renderPerbKriteria();renderSubkriteriaTabs();renderPenilaian();saveKrit(id);
});
$('#tableAlternatif tbody')?.addEventListener('input',e=>{
    if(!e.target.classList.contains('alt-nama'))return;
    const id=Number(e.target.closest('tr').dataset.id);
    const a=state.alternatif.find(x=>x.id===id);if(!a)return;
    a.nama=e.target.value;renderPenilaian();saveAlt(id);
});
$('#tableSubKriteria tbody')?.addEventListener('input',e=>{
    if(!e.target.classList.contains('sub-nama'))return;
    const id=Number(e.target.closest('tr').dataset.id);
    const s=state.subKriteria.find(x=>x.id===id);if(!s)return;
    s.nama=e.target.value;
    renderSubkriteriaTabs();renderPenilaian();saveSub(id);
});

$('#tablePerbandinganKriteria')?.addEventListener('change',e=>{
    if(!e.target.classList.contains('perb-krit-input'))return;
    const k1=Number(e.target.dataset.k1),k2=Number(e.target.dataset.k2),val=parseFloat(e.target.value);
    state.perbandingan[`${k1}-${k2}`]=val;
    renderPerbKriteria();savePerb();
});

$('#tabContentSubkriteria')?.addEventListener('change',e=>{
    if(!e.target.classList.contains('perb-sub-input'))return;
    const kid=Number(e.target.dataset.kid),s1=Number(e.target.dataset.s1),s2=Number(e.target.dataset.s2),val=parseFloat(e.target.value);
    state.perbandinganSub[`${kid}-${s1}-${s2}`]=val;
    renderSubkriteriaTabs();savePerbSub();
});

$('#tablePenilaian')?.addEventListener('change',e=>{
    if(!e.target.classList.contains('penilaian-input'))return;
    const aid=Number(e.target.dataset.aid),kid=Number(e.target.dataset.kid),val=parseInt(e.target.value);
    state.penilaian[`${aid}-${kid}`]=val;
    savePenilaian();
});

$('#btnHitung')?.addEventListener('click',hitungAHP);

window.addEventListener('DOMContentLoaded',async()=>{
    try{
        const d=await api('GET','/data');
        state.kriteria=d.kriteria||[];
        state.alternatif=d.alternatif||[];
        state.subKriteria=d.subKriteria||[];
        state.penilaian=d.penilaian||{};
        state.perbandingan={};
        (d.perbandingan||[]).forEach(r=>{state.perbandingan[`${r.kriteria_id_1}-${r.kriteria_id_2}`]=r.nilai;});
        state.perbandinganSub={};
        (d.perbandinganSub||[]).forEach(r=>{state.perbandinganSub[`${r.kriteria_id}-${r.sub_id_1}-${r.sub_id_2}`]=r.nilai;});
        renderAll();
        hitungAHP(true);
    }catch(e){console.error(e);renderAll();}
});
})();