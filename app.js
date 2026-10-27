(function () {
  'use strict';

  // To send contact messages for real, create a form at a service such as Formspree
  // and paste its address here, e.g. 'https://formspree.io/f/your-id'.
  // While this is empty, the form prepares the message for the visitor to copy or email.
  var FORM_ENDPOINT = '';
  var GYM_EMAIL = 'Gymbyishant@gmail.com';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function fmt(n) { return n.toLocaleString('en-IN'); }

  /* ---------- Watt meter (home page) ---------- */
  function initMeter() {
    var meter = $('#meter');
    if (!meter) return;
    var riders = $('#riders'), effort = $('#effort'), bar = $('#bar');
    var N = 40, MAX_WATTS = 4000, segs = [];
    for (var i = 0; i < N; i++) {
      var s = document.createElement('span');
      bar.appendChild(s);
      segs.push(s);
    }
    function update() {
      var r = +riders.value, e = +effort.value, t = r * e;
      var lit = Math.min(N, Math.round(t / MAX_WATTS * N));
      segs.forEach(function (seg, idx) { seg.classList.toggle('on', idx < lit); });
      $('#total').textContent = fmt(t);
      $('#riders-out').textContent = r;
      $('#effort-out').textContent = e + ' W';
      $('#eq-bulbs').textContent = fmt(Math.floor(t / 9));
      $('#eq-fans').textContent = fmt(Math.floor(t / 70));
      $('#eq-chargers').textContent = fmt(Math.floor(t / 10));
    }
    riders.addEventListener('input', update);
    effort.addEventListener('input', update);
    update();
  }

  /* ---------- Opening hours and open/closed status ---------- */
  // Minutes after midnight, India Standard Time. 0 = Sunday.
  var SCHEDULE = { 0: [420, 780], 1: [330, 1290], 2: [330, 1290], 3: [330, 1290], 4: [330, 1290], 5: [330, 1290], 6: [330, 1290] };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function t12(m) {
    var h = Math.floor(m / 60), mm = m % 60;
    return (h % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

  function istNow() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return { day: DAYS.indexOf(o.weekday), min: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
  }

  function initHours() {
    var targets = $$('[data-open-status]'), rows = $$('.hours tr');
    if (!targets.length && !rows.length) return;
    try {
      var n = istNow();
      if (n.day < 0) return;
      var h = SCHEDULE[n.day], msg, state;
      if (n.min >= h[0] && n.min < h[1]) {
        state = 'open';
        msg = 'Open now, closes ' + t12(h[1]);
      } else {
        state = 'closed';
        if (n.min < h[0]) {
          msg = 'Closed, opens today at ' + t12(h[0]);
        } else {
          var next = (n.day + 1) % 7;
          msg = 'Closed, opens tomorrow (' + DAYS[next] + ') at ' + t12(SCHEDULE[next][0]);
        }
      }
      targets.forEach(function (el) { el.textContent = msg; el.setAttribute('data-state', state); });
      rows.forEach(function (tr) {
        var days = (tr.getAttribute('data-days') || '').split(',');
        if (days.indexOf(String(n.day)) > -1) tr.setAttribute('data-today', '');
      });
    } catch (err) { /* keep the static hours text */ }
  }

  /* ---------- Copy buttons ---------- */
  function selectNode(el) {
    if (!el) return;
    if (typeof el.select === 'function') { el.select(); return; }
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function copyWith(btn, text, sourceEl) {
    var label = btn.getAttribute('data-label') || btn.textContent;
    btn.setAttribute('data-label', label);
    function say(t) { btn.textContent = t; setTimeout(function () { btn.textContent = label; }, 1800); }
    try {
      navigator.clipboard.writeText(text).then(function () { say('Copied'); }, function () { selectNode(sourceEl); say('Selected, now copy'); });
    } catch (err) {
      selectNode(sourceEl);
      say('Selected, now copy');
    }
  }

  function initCopy() {
    $$('[data-copy-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = $(btn.getAttribute('data-copy-target'));
        if (el) copyWith(btn, el.textContent.trim(), el);
      });
    });
  }

  /* ---------- Contact form ---------- */
  function initForm() {
    var form = $('#contact-form');
    if (!form) return;
    var interest = $('#interest'), result = $('#form-result');
    var HASH_TO_INTEREST = { 'free-trial': 'Free trial', 'day-pass': 'Day pass', 'monthly': 'Monthly membership', 'team': 'Team plan' };
    var wanted = HASH_TO_INTEREST[(location.hash || '').slice(1)];
    if (wanted) interest.value = wanted;

    function setError(id, msg) {
      var input = $('#' + (id === 'email' ? 'email-input' : id)), box = $('#' + id + '-err');
      if (msg) { input.setAttribute('aria-invalid', 'true'); box.textContent = msg; box.hidden = false; }
      else { input.removeAttribute('aria-invalid'); box.textContent = ''; box.hidden = true; }
    }

    function showMessage(title, text, withDraft, draft, mailto) {
      $('#result-title').textContent = title;
      $('#result-text').textContent = text;
      $('#result-body').hidden = !withDraft;
      $('#result-actions').hidden = !withDraft;
      if (withDraft) {
        $('#result-body').value = draft;
        $('#mailto').setAttribute('href', mailto);
      }
      result.hidden = false;
      result.scrollIntoView({ block: 'nearest' });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#name').value.trim(), email = $('#email-input').value.trim(), msg = $('#message').value.trim();
      var okName = name.length > 0;
      var okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      setError('name', okName ? '' : 'Enter your name so we know who to reply to.');
      setError('email', okEmail ? '' : 'Enter an email address like name@example.com.');
      if (!okName || !okEmail) { $(okName ? '#email-input' : '#name').focus(); return; }

      var draft = 'Name: ' + name + '\nEmail: ' + email + '\nInterested in: ' + interest.value + '\n\n' + (msg || '(no message)');
      var mailto = 'mailto:' + GYM_EMAIL + '?subject=' + encodeURIComponent('Energy Gym enquiry: ' + interest.value) + '&body=' + encodeURIComponent(draft);

      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ name: name, email: email, interest: interest.value, message: msg })
        }).then(function (res) {
          if (!res.ok) throw new Error('bad status');
          showMessage('Message sent', 'Thanks, ' + name + '. We will reply to ' + email + '.', false);
          form.reset();
        }).catch(function () {
          showMessage('That did not send', 'Copy the message below and email it to ' + GYM_EMAIL + '.', true, draft, mailto);
        });
      } else {
        showMessage('Your message is ready', 'This page cannot send email by itself. Copy the message and email it to ' + GYM_EMAIL + '.', true, draft, mailto);
      }
    });

    $('#copy-msg').addEventListener('click', function () {
      var ta = $('#result-body');
      copyWith(this, ta.value, ta);
    });
  }

  initMeter();
  initHours();
  initCopy();
  initForm();
})();
