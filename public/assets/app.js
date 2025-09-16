/* public/assets/app.js */
(function () {
  'use strict';

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
  function escapeHTML(s) {
    s = String(s);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  async function fetchJSONFallback(paths) {
    for (const p of paths) {
      try {
        const r = await fetch(p, { cache: 'no-store' });
        if (r.ok) return await r.json();
      } catch (_) {}
    }
    return null;
  }

  // ---------- Shared: data.json (cache jednego pobrania) ----------
  let __DATA_PROMISE = null;
  function getSiteData() {
    if (!__DATA_PROMISE) {
      __DATA_PROMISE = fetchJSONFallback(['assets/data.json', '/data.json']).then((j) => j || {});
    }
    return __DATA_PROMISE;
  }

  // ---------- Rok w stopce ----------
  (function setYear() {
    const el = $('#year');
    if (el) el.textContent = new Date().getFullYear();
  })();

  // ---------- Formularz kontaktowy (mailto fallback) ----------
  (function contactForm() {
    const form = $('#contactForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const msg = form.message.value.trim();
      const status = $('#formStatus');
      if (!name || !email || !msg) {
        if (status) {
          status.textContent = 'Uzupełnij wszystkie pola.';
          status.style.color = '#b91c1c';
        }
        return;
      }
      const subject = encodeURIComponent('Zgłoszenie konsultacji – Valivio');
      const body = encodeURIComponent(
        `Imię i nazwisko: ${name}\nE-mail: ${email}\n\nWiadomość:\n${msg}`
      );
      window.location.href = `mailto:contact@valivio.example?subject=${subject}&body=${body}`;
      setTimeout(() => {
        form.reset();
        if (status) {
          status.textContent =
            'Dziękuję! Jeśli e-mail się nie otworzył, napisz bezpośrednio na contact@valivio.example.';
          status.style.color = '#111';
        }
      }, 600);
    });
  })();

  // ============================================================
  // DLA KOGO – Slider poziomy 3/2/1, auto-scroll o 1
  // ============================================================
  (function dlaKogoSlider() {
    const root = $('#dlaKogoCards');
    if (!root) return;

    // Zapewnij strukturę
    if (!root.querySelector('.dk-viewport') || !root.querySelector('.dk-track')) {
      root.innerHTML = '<div class="dk-viewport"><div class="dk-track"></div></div>';
    }
    const viewport = root.querySelector('.dk-viewport');
    const track = root.querySelector('.dk-track');

    const DK_CYCLE_MS_DESKTOP = 5000;
    const DK_CYCLE_MS_TABLET = 4000;
    const DK_CYCLE_MS_MOBILE = 2000;

    let items = [];
    let timer = null;

    function getGapPx() {
      const cs = getComputedStyle(track);
      const gap = cs.gap || '24px';
      const m = /([\d.]+)px/.exec(gap);
      return m ? parseFloat(m[1]) : 24;
    }

    function stepScroll() {
      if (!viewport || !items.length) return;
      const firstCard = items[0].getBoundingClientRect();
      const step = Math.round(firstCard.width + getGapPx());
      const maxScroll = track.scrollWidth - viewport.clientWidth;
      const next = Math.min(viewport.scrollLeft + step, maxScroll);
      if (viewport.scrollLeft >= maxScroll - 2) {
        viewport.scrollTo({ left: 0, behavior: 'instant' });
      } else {
        viewport.scrollTo({ left: next, behavior: 'smooth' });
      }
    }

    function cycleDelay() {
      const w = window.innerWidth;
      if (w <= 680) return DK_CYCLE_MS_MOBILE;
      if (w <= 960) return DK_CYCLE_MS_TABLET;
      return DK_CYCLE_MS_DESKTOP;
    }

    function startTimer() {
      stopTimer();
      timer = setInterval(stepScroll, cycleDelay());
    }
    function stopTimer() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    viewport.addEventListener('mouseenter', stopTimer);
    viewport.addEventListener('mouseleave', startTimer);
    window.addEventListener('visibilitychange', () => (document.hidden ? stopTimer() : startTimer()));
    window.addEventListener('resize', startTimer);

    getSiteData().then((json) => {
      const list = (json && json.dlaKogo) || [];
      track.innerHTML = list
        .map(
          (it) => `
            <div class="dk-card">
              <div class="card">
                <h3 class="h3">${escapeHTML(it.title || '')}</h3>
                <p class="meta">${escapeHTML(it.text || '')}</p>
              </div>
            </div>`
        )
        .join('');
      items = $$('.dk-card', track);
      root.classList.add('dk-fade');
      requestAnimationFrame(() => root.classList.remove('dk-fade'));
      startTimer();
    });
  })();

  // ==================================
  // JAK PRACUJĘ – render kart z data.json.proces
  // ==================================
  (function procesLoader() {
    const mount = $('#procesCards');
    if (!mount) return;
    getSiteData().then((json) => {
      const list = (json && json.proces) || [];
      if (!Array.isArray(list) || !list.length) return;
      mount.innerHTML = list
        .map(
          (it) => `
          <div class="card">
            <h3 class="h3">${escapeHTML(it.title || '')}</h3>
            <p class="meta">${escapeHTML(it.text || '')}</p>
          </div>`
        )
        .join('');
    });
  })();

  // ==================================
  // OFERTA – render kart z data.json.oferta (układ sztywny)
  // ==================================
  (function ofertaLoader() {
    const mount = $('#ofertaCards');
    if (!mount) return;
    getSiteData().then((json) => {
      const items = (json && json.oferta) || [];
      if (!Array.isArray(items) || !items.length) return;
      mount.innerHTML = items
        .map((it) => {
          const title = escapeHTML(it.title || '');
          const desc = escapeHTML(it.desc || '');
          const bullets = Array.isArray(it.bullets) ? it.bullets : [];
          const price = escapeHTML(it.price || '');
          const li = bullets
            .slice(0, 3)
            .map((b) => `<li>${escapeHTML(b)}</li>`)
            .join('');
          return `
          <div class="card">
            <h3 class="h3 of-title">${title}</h3>
            <p class="meta of-desc">${desc}</p>
            <ul class="of-list">${li}</ul>
            <p class="of-price price">${price}</p>
            <a class="btn" href="rezerwacja.html">Umów sesję</a>
          </div>`;
        })
        .join('');
    });
  })();

  // ==================================
  // FAQ – treść z assets/faq.json
  // ==================================
  (async function faqLoader() {
    const mount = $('#faqList') || $('#faq .faq-list');
    if (!mount) return;
    const data = await fetchJSONFallback(['assets/faq.json', '/faq.json']);
    const items = Array.isArray(data) ? data : (data && data.faq) || [];
    if (!items.length) {
      mount.innerHTML = '<p class="muted">FAQ w przygotowaniu.</p>';
      return;
    }
    mount.innerHTML = items
      .map(
        (it) => `
        <details>
          <summary>${escapeHTML(it.q || '')}</summary>
          <div class="mt-12">${escapeHTML(String(it.a || '')).replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>')}</div>
        </details>`
      )
      .join('');
  })();

  // ==================================
  // O MNIE – treść z assets/about.html/md
  // ==================================
  (function aboutLoader() {
    const mount = $('#aboutMount');
    if (!mount) return;

    fetch('assets/about.html', { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((html) => {
        mount.innerHTML = html;
      })
      .catch(() => {
        fetch('assets/about.md', { cache: 'no-store' })
          .then((r) => (r.ok ? r.text() : Promise.reject()))
          .then((md) => {
            mount.innerHTML = mdToHTML(md);
          })
          .catch(() => {
            mount.innerHTML = '<p class="muted">Sekcja „O mnie” w przygotowaniu.</p>';
          });
      });

    function mdToHTML(md) {
      // bardzo prosty markdown->html (bez replaceAll)
      md = String(md);
      let html = escapeHTML(md);
      html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
      html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
      html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      html = html.replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>)(\s*(<li>.*<\/li>))+?/gs, function (m) {
        return '<ul>' + m + '</ul>';
      });
      html = html.replace(/(?:\r?\n){2,}/g, '</p><p>');
      return '<p>' + html + '</p>';
    }
  })();

  // ============================================================
  // REZERWACJA – filtr wg miesiąca + wybór dnia/godziny + modal
  // ============================================================
  (function booking() {
    const mount = $('#bookMount');
    if (!mount) return;

    const datesEl = $('#dates');
    const slotsEl = $('#slots');
    const summaryEl = $('#summaryText');
    const payBtn = $('#payBtn');
    const modal = $('#payModal');
    const backdrop = $('#payBackdrop');
    const payInfo = $('#payInfo');
    const payClose = $('#payClose');
    const monthSelect = $('#monthSelect');

    let selectedDate = null;
    let selectedTime = null;
    let dataSlots = {}; // { "YYYY-MM-DD": ["HH:mm", ...] }

    function fmtISODate(d) {
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }
    function plDayName(date) {
      return date.toLocaleDateString('pl-PL', { weekday: 'short' }).replace('.', '');
    }
    function plDateLabel(date) {
      return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
    }
    function plMonthLabel(y, m) {
      return new Date(y, m - 1, 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
    }

    function showModal() {
      if (!selectedDate || !selectedTime) return;
      if (payInfo) payInfo.textContent = 'Termin: ' + selectedDate + ' godz. ' + selectedTime + '.';
      if (modal) modal.classList.add('show');
      if (backdrop) backdrop.classList.add('show');
    }
    function hideModal() {
      if (modal) modal.classList.remove('show');
      if (backdrop) backdrop.classList.remove('show');
    }
    if (backdrop) backdrop.addEventListener('click', hideModal);
    if (payClose) payClose.addEventListener('click', hideModal);
    window.addEventListener('keydown', (e) => e.key === 'Escape' && hideModal());

    function renderDates() {
      const keys = Object.keys(dataSlots || {});
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const days = keys
        .map((k) => {
          const parts = k.split('-').map(Number);
          const dt = new Date(parts[0], parts[1] - 1, parts[2]);
          return { iso: k, date: dt, count: (dataSlots[k] || []).length };
        })
        .filter((x) => x.date >= today && x.count > 0)
        .sort((a, b) => a.date - b.date);

      if (!days.length) {
        datesEl.innerHTML = '<p class="muted">Brak terminów w wybranym miesiącu.</p>';
        slotsEl.innerHTML = '';
        selectedDate = null;
        selectedTime = null;
        updateSummary();
        return;
      }

      datesEl.innerHTML = days
        .map(
          (d) => `
            <button class="date-btn" data-date="${d.iso}">
              <span class="date-dow">${plDayName(d.date)}</span>
              <span class="date-day">${plDateLabel(d.date)}</span>
              <span class="date-meta">${d.count}&nbsp;termin(y)</span>
            </button>`
        )
        .join('');
    }

    function renderSlotsFor(dateISO) {
      const list = dataSlots[dateISO] || [];
      slotsEl.innerHTML = list.length
        ? list.map((t) => `<button class="slot-btn" data-time="${t}">${t}</button>`).join('')
        : '<p class="muted">Brak terminów dla wybranego dnia.</p>';
    }

    function updateSummary() {
      if (selectedDate && selectedTime) {
        summaryEl.textContent = 'Wybrano: ' + selectedDate + ' — ' + selectedTime;
        payBtn.disabled = false;
      } else {
        summaryEl.textContent = 'Nie wybrano terminu.';
        payBtn.disabled = true;
      }
    }

    datesEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.date-btn');
      if (!btn) return;
      selectedDate = btn.getAttribute('data-date');
      selectedTime = null;
      $$('.date-btn', datesEl).forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderSlotsFor(selectedDate);
      updateSummary();
    });

    slotsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.slot-btn');
      if (!btn) return;
      selectedTime = btn.getAttribute('data-time');
      $$('.slot-btn', slotsEl).forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      updateSummary();
    });

    if (payBtn) {
      payBtn.addEventListener('click', async () => {
        if (!selectedDate || !selectedTime) return;
        try {
          const res = await fetch('/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: selectedDate, time: selectedTime })
          });
          if (res.ok) showModal();
          else {
            let body = {};
            try { body = await res.json(); } catch {}
            alert((body && (body.message || body.error)) || 'Ten termin jest już zajęty. Wybierz inny.');
          }
        } catch { alert('Błąd połączenia. Spróbuj ponownie.'); }
      });
    }

    // --- Filtr miesiąca ---
    function populateMonths() {
      if (!monthSelect) return;
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const opts = [];
      for (let i = 0; i < 12; i++) {
        const mm = ((m + i - 1) % 12) + 1;
        const yy = y + Math.floor((m + i - 1) / 12);
        opts.push({ value: yy + '-' + pad2(mm), label: plMonthLabel(yy, mm) });
      }
      monthSelect.innerHTML = opts.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
      monthSelect.value = y + '-' + pad2(m);
    }

    async function fetchMonth(ym) {
      const parts = (ym || '').split('-').map(Number);
      const yy = parts[0], mm = parts[1];
      if (!yy || !mm) return;
      const first = new Date(yy, mm - 1, 1);
      const last = new Date(yy, mm, 0);
      const url = '/api/slots?from=' + fmtISODate(first) + '&to=' + fmtISODate(last);
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        dataSlots = (json && json.slots) ? json.slots : {};
        renderDates();
        const firstBtn = $('.date-btn', datesEl);
        if (firstBtn) firstBtn.click();
      } catch {
        datesEl.innerHTML = '<p class="muted">Nie udało się wczytać terminów.</p>';
      }
    }

    if (monthSelect) {
      populateMonths();
      monthSelect.addEventListener('change', () => {
        selectedDate = null; selectedTime = null; updateSummary();
        fetchMonth(monthSelect.value);
      });
      fetchMonth(monthSelect.value); // start
    } else {
      const from = fmtISODate(new Date());
      fetch('/api/slots?from=' + from, { cache: 'no-store' })
        .then((r) => r.json())
        .then((json) => {
          dataSlots = json && json.slots ? json.slots : {};
          renderDates();
          const firstBtn = $('.date-btn', datesEl);
          if (firstBtn) firstBtn.click();
        })
        .catch(() => {
          datesEl.innerHTML = '<p class="muted">Nie udało się wczytać terminów.</p>';
        });
    }
  })();
})();
