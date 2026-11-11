
(() => {
  'use strict';
  const $ = (q) => document.querySelector(q);
  const $$ = (q) => Array.from(document.querySelectorAll(q));
  const fmt = (v, digits = 2) => Number(v).toLocaleString('en-US', {maximumFractionDigits: digits});
  const val = (id) => Number(document.getElementById(id)?.value);
  const valid = (...nums) => nums.every(n => Number.isFinite(n) && n > 0);

  const menu = $('.mobile-menu');
  const nav = $('#site-nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
      menu.textContent = open ? '✕ Close' : '☰ Menu';
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.textContent = '☰ Menu';
    }));
  }

  const search = $('#article-search');
  const list = $$('#guide-grid .guide-card');
  if (search && list.length) {
    let category = 'ALL';
    const update = () => {
      const q = search.value.trim().toLowerCase();
      let count = 0;
      list.forEach(card => {
        const match = (category === 'ALL' || card.dataset.category === category) && card.dataset.search.includes(q);
        card.classList.toggle('hidden', !match);
        if (match) count++;
      });
      $('#list-count').textContent = `Showing ${count} guide${count === 1 ? '' : 's'}`;
      $('#no-guides')?.classList.toggle('hidden', count !== 0);
    };
    search.addEventListener('input', update);
    $$('.filter').forEach(button => button.addEventListener('click', () => {
      category = button.dataset.filter;
      $$('.filter').forEach(b => { const selected = b === button; b.classList.toggle('active', selected); b.setAttribute('aria-pressed', String(selected)); });
      update();
    }));
  }

  const watt = $('#watt-form');
  if (watt) watt.addEventListener('submit', (e) => {
    e.preventDefault();
    const mah = val('watt-mah'), volts = val('watt-volts'), load = val('watt-load'), eff = val('watt-eff');
    const out = $('#watt-result');
    if (!valid(mah,volts,load,eff) || eff > 100) { out.textContent='Enter positive, finite values and an efficiency between 1 and 100%.'; out.classList.add('show'); return; }
    const wh = mah * volts / 1000;
    const usable = wh * eff / 100;
    const runtime = usable / load;
    let travel = 'Above 160 Wh: not permitted for ordinary passenger spare lithium-ion batteries under FAA guidance.';
    if (wh <= 100) travel = '0–100 Wh: generally within the FAA ordinary spare-battery size category; carry-on only and check airline rules.';
    else if (wh <= 160) travel = '101–160 Wh: FAA airline approval required, with limits on larger spare batteries; carry-on only.';
    out.innerHTML = `<strong>${fmt(wh)} Wh nominal stored energy</strong><p>Usable model: <b>${fmt(usable)} Wh</b> after ${fmt(eff,0)}% assumed efficiency.<br>Constant-load runtime estimate: <b>${fmt(runtime)} hours</b> at ${fmt(load)} W.<br><span class="mini">Equation: (${fmt(mah)} ÷ 1000 × ${fmt(volts)} V) × ${fmt(eff,0)}% ÷ ${fmt(load)} W.</span></p><p><b>FAA U.S. reference:</b> ${travel} This does not establish approval or safety.</p>`;
    out.classList.add('show');
  });

  const bank = $('#bank-form');
  if (bank) bank.addEventListener('submit', (e) => {
    e.preventDefault();
    const mah = val('bank-mah'), v = val('bank-v'), device = val('bank-device'), eff = val('bank-eff');
    const out = $('#bank-result');
    if (!valid(mah,v,device,eff) || eff > 100) { out.textContent='Enter positive, finite values and an efficiency between 1 and 100%.'; out.classList.add('show'); return; }
    const wh = mah*v/1000, usable = wh*eff/100, count = usable/device;
    out.innerHTML = `<strong>${fmt(count)} theoretical full-charge equivalents</strong><p>Bank energy: <b>${fmt(wh)} Wh</b>; modeled usable: <b>${fmt(usable)} Wh</b>.<br>Device energy input: <b>${fmt(device)} Wh</b>.<br><span class="mini">Equation: ${fmt(wh)} Wh × ${fmt(eff,0)}% ÷ ${fmt(device)} Wh.</span></p><p>Real charging can be lower due to device use, charging electronics and temperature.</p>`;
    out.classList.add('show');
  });

  const logForm = $('#log-form');
  if (logForm) {
    const key = 'chargefolio-local-journal-v1';
    const listNode = $('#log-list');
    const message = $('#log-message');
    let entries = [];
    let usableStorage = true;
    try {
      const read = JSON.parse(localStorage.getItem(key) || '[]');
      entries = Array.isArray(read) ? read.filter(e => e && typeof e === 'object').slice(0,250) : [];
    } catch(e) { usableStorage = false; message.textContent = 'Browser storage is unavailable; export entries before leaving this page.'; }
    const date = $('#log-date');
    if(date && !date.value){
      const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); date.value = now.toISOString().slice(0,10);
    }
    function persist() {
      try { localStorage.setItem(key, JSON.stringify(entries)); usableStorage = true; }
      catch(err) { usableStorage = false; message.textContent = 'Cannot save in this browser session. Export notes before closing.'; }
    }
    function render() {
      listNode.replaceChildren();
      $('#log-count').textContent = `(${entries.length})`;
      if (!entries.length) { const p=document.createElement('p'); p.className='mini'; p.textContent='No observations saved yet.'; listNode.append(p); return; }
      entries.forEach((r,i) => {
        const row=document.createElement('div'); row.className='logrow';
        const block=document.createElement('div');
        const strong=document.createElement('strong'); strong.textContent=`${r.device} — ${r.topic}`;
        const desc=document.createElement('p'); desc.textContent=r.note;
        const small=document.createElement('span'); small.className='mini'; small.textContent=r.date;
        block.append(strong,desc,small);
        const del=document.createElement('button'); del.type='button'; del.className='btn alt'; del.textContent='Delete'; del.setAttribute('aria-label',`Delete entry for ${r.device}`);
        del.addEventListener('click',()=>{ entries.splice(i,1); persist(); render(); message.textContent='Entry deleted.'; });
        row.append(block,del); listNode.append(row);
      });
    }
    logForm.addEventListener('submit', e => {
      e.preventDefault();
      const device=$('#log-device').value.trim().slice(0,60), date=$('#log-date').value, topic=$('#log-topic').value, note=$('#log-note').value.trim().slice(0,280);
      if (!device || !date || !note) { message.textContent='Please enter a nickname, date and observation.'; return; }
      entries.unshift({device,date,topic,note}); entries=entries.slice(0,250); persist(); render();
      message.textContent=usableStorage?'Saved in this browser only.':'In memory only; export to avoid losing it.';
      $('#log-note').value='';
    });
    $('#log-export')?.addEventListener('click', () => {
      if (!entries.length) { message.textContent='Add an entry before exporting.'; return; }
      const esc = value => {
        let s=String(value??''); if(/^[=+\-@]/.test(s)) s="'"+s;
        return '"'+s.replace(/"/g,'""')+'"';
      };
      const csv=['Date,Device,Type,Observation',...entries.map(r=>[r.date,r.device,r.topic,r.note].map(esc).join(','))].join('\r\n');
      const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download='chargefolio-battery-journal.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); message.textContent='CSV export downloaded.';
    });
    render();
  }
})();
