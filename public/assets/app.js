/* public/assets/app.js */
(function () {
  'use strict';

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

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
  // DLA KOGO – Slider poziomy: 3/2/1 widocznych, auto-scroll o 1
  // ============================================================
  (function dlaKogoSlider() {
    const root = $('#dlaKogoCards');
    if (!root) return;

    const viewport = root.querySelector('.dk-viewport');
    const track = root.querySelector('.dk-track');

    // Konfiguracja prędkości (ms)
    const DK_CYCLE_MS_DESKTOP = 5000;
    const DK_CYCLE_MS_TABLET = 4000;
    const DK_CYCLE_MS_MOBILE = 2000; // <- zmień tu, jeśli chcesz np. 3000 na telefonie

    let items = [];
    let timer = null;

    function visibleCount() {
      const w = window.innerWidth;
      if (w <= 680) return 1;
      if (w <= 960) return 2;
      return 3;
    }

    function cycleDelay() {
      const w = window.innerWidth;
      if (w <= 680) return DK_CYCLE_MS_MOBILE;
      if (w <= 960) return DK_CYCLE_MS_TABLET;
      return DK_CYCLE_MS_DESKTOP;
    }

    function render(list) {
      // list: [{title, text}, ...]
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
      // wyrównanie wejścia (klasa animacyjna z CSS – opcjonalnie)
      root.classList.add('dk-fade');
      requestAnimationFrame(() => root.classList.remove('dk-fade'));
    }

    function stepScroll() {
      if (!viewport || !items.length) return;
      const firstCard = items[0].getBoundingClientRect();
      const gap = getGapPx();
      const step = Math.round(firstCard.width + gap);
      const maxScroll = track.scrollWidth - viewport.clientWidth;
      const next = Math.min(viewport.scrollLeft + step, maxScroll);

      if (viewport.scrollLeft >= maxScroll - 2) {
        // restart do początku
        viewport.scrollTo({ left: 0, behavior: 'instant' });
      } else {
        viewport.scrollTo({ left: next, behavior: 'smooth' });
      }
    }

    function getGapPx() {
      const cs = getComputedStyle(track);
      const gap = cs.gap || '24px';
      const m = gap.match(/([\d.]+)px/);
      return m ? parseFloat(m[1]) : 24;
    }

    function startTimer() {
      stopTimer();
      timer = setInterval(stepScroll, cycleDelay());
    }
    function stopTimer() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    // Pauza na hover (desktop)
    viewport.addEventListener('mouseenter', stopTimer);
    viewport.addEventListener('mouseleave', startTimer);
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) stopTimer();
      else startTimer();
    });
    window.addEventListener('resize', () => {
      // po resize zresetuj timer (inne czasy) i dociśnij do „siatki”
      startTimer();
    });

    // Wczytaj treść z assets/data.json
    fetch('assets/data.json', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        const list = (json && json.dlaKogo) || []; // [{title,text}, ...]
        render(list);
        startTimer();
      })
      .catch(() => {
        // awaryjnie: jeśli brak pliku, nie psuj strony
      });

    function escapeHTML(s) {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }
  })();

  // ==================================
  // FAQ – treść z assets/faq.json
  // ==================================
  (function faqLoader() {
    const mount =
      $('#faqList') || // np. <div id="faqList"></div>
      $('#faq .faq-list') || // fallback
      null;
    if (!mount) return;

    fetch('assets/faq.json', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : data?.faq || [];
        if (!items.length) {
          mount.innerHTML = '<p class="muted">FAQ w przygotowaniu.</p>';
          return;
        }
        mount.innerHTML = items
          .map(
            (it) => `
            <details>
              <summary>${escapeHTML(it.q || '')}</summary>
              <div class="mt-12">${nl2p(it.a || '')}</div>
            </details>`
          )
          .join('');
      })
      .catch(() => {
        mount.innerHTML = '<p class="muted">Nie udało się wczytać FAQ.</p>';
      });

    function escapeHTML(s) {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }
    function nl2p(txt) {
      const safe = escapeHTML(txt).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
      return `<p>${safe}</p>`;
    }
  })();

  // ==================================
  // O MNIE – treść z assets/about.html/md
  // ==================================
  (function aboutLoader() {
    const mount = $('#aboutMount'); // np. <main id="aboutMount"></main>
    if (!mount) return;

    // Spróbuj HTML, potem Markdown (prosty konwerter)
    fetch('assets/about.html', { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((html) => {
        mount.innerHTML = html;
      })
      .catch(() => {
        // Markdown fallback
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
      // bardzo prosty markdown->html (nagłówki #, akapity, bold/italic, listy)
      const esc = (s) =>
        s
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;');
      let html = esc(md);
      html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
      html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
      html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // listy
      html = html.replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>)(\s*(<li>.*<\/li>))+?/gs, (m) => `<ul>${m}</ul>`);
      // akapity
      html = html.replace(/(?:\r?\n){2,}/g, '</p><p>');
      html = `<p>${html}</p>`;
      return html;
    }
  })();

  // ============================================================
  // REZERWACJA – filtr wg miesiąca + wybór dnia/godziny + modal
  // ============================================================
  (function loadBooking() {
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
      return new Date(y, m - 1, 1).toLocaleDateString('pl-PL', {
        month: 'long',
        year: 'numeric',
      });
    }

    function showModal() {
      if (!selectedDate || !selectedTime) return;
      if (payInfo) payInfo.textContent = 'Termin: ' + selectedDate + ' godz. ' + selectedTime + '.';
      modal?.classList.add('show');
      backdrop?.classList.add('show');
    }
    function hideModal() {
      modal?.classList.remove('show');
      backdrop?.classList.remove('show');
    }
    backdrop?.addEventListener('click', hideModal);
    payClose?.addEventListener('click', hideModal);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideModal();
    });

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
        datesEl.innerHTML =
          '<p class="muted">Brak terminów w wybranym miesiącu.</p>';
        slotsEl.innerHTML = '';
        selectedDate = null;
        selectedTime = null;
        updateSummary();
        return;
      }

      datesEl.innerHTML = days
        .map(
          (d) =>
            `<button class="date-btn" data-date="${d.iso}">
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

    payBtn?.addEventListener('click', async () => {
      if (!selectedDate || !selectedTime) return;
      try {
        const res = await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: selectedDate, time: selectedTime }),
        });
        if (res.ok) {
          showModal();
        } else {
          let body = {};
          try {
            body = await res.json();
          } catch {}
          alert(
            (body && (body.message || body.error)) ||
              'Ten termin jest już zajęty. Wybierz inny.'
          );
        }
      } catch {
        alert('Błąd połączenia. Spróbuj ponownie.');
      }
    });

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
      monthSelect.innerHTML = opts
        .map((o) => `<option value="${o.value}">${o.label}</option>`)
        .join('');
      monthSelect.value = y + '-' + pad2(m);
    }

    async function fetchMonth(ym) {
      const parts = (ym || '').split('-').map(Number);
      const yy = parts[0],
        mm = parts[1];
      if (!yy || !mm) return;

      const first = new Date(yy, mm - 1, 1);
      const last = new Date(yy, mm, 0);

      const url =
        '/api/slots?from=' + fmtISODate(first) + '&to=' + fmtISODate(last);
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        dataSlots = json && json.slots ? json.slots : {};
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
        selectedDate = null;
        selectedTime = null;
        updateSummary();
        fetchMonth(monthSelect.value);
      });
      // start: bieżący miesiąc
      fetchMonth(monthSelect.value);
    } else {
      // awaryjnie: stary tryb (21 dni od dziś)
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
          datesEl.innerHTML =
            '<p class="muted">Nie udało się wczytać terminów.</p>';
        });
    }
  })();
})();
