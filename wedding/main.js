/* ==========================================================================
   Freddy & Joshua — Invercharron
   Everything here is enhancement. With JavaScript off the page renders
   complete: the house is fully drawn, nothing is hidden, nothing moves.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine    = window.matchMedia('(hover: hover) and (pointer: fine)');

  var root     = document.documentElement;
  var card     = document.querySelector('.card');
  var spaniel  = document.querySelector('.spaniel');
  var cake        = document.querySelector('.cake');
  var darkGrounds = document.querySelectorAll('.days, .address');
  var stage    = document.querySelector('.card-stage');

  /* ---- what arrives on scroll -------------------------------------------
     Deliberately NOT IntersectionObserver. If a section is skipped past in
     one jump — an anchor link, a restored scroll position, a flick on a
     phone — its intersection ratio never changes, no callback fires, and it
     stays invisible for good. A sweep against the current geometry reveals
     anything that is in view OR already behind us.                        */
  var pending = [];

  var toReveal = document.querySelectorAll(
    '.day, .led-row, .days-foot, .tap-note, ' +
    '.day-grid, .closing-mono, .closing-line, .closing-note, ' +
    '.sec-title, .eyebrow, .lede.centred, .map-cap, .map-frame, ' +
    '.field, .addr-send, .addr-alt'
  );

  var pump = null;

  function sweep() {
    if (!pending.length) {
      if (pump) { clearInterval(pump); pump = null; }
      return;
    }
    var vh = window.innerHeight, still = [], i, el, top;
    for (i = 0; i < pending.length; i++) {
      el  = pending[i];
      top = el.getBoundingClientRect().top;
      if (top < vh * 0.88) {
        var sibs = el.parentNode ? el.parentNode.children : [];
        var k = Array.prototype.indexOf.call(sibs, el);
        el.style.setProperty('--stagger', Math.min(k, 6) * 0.06 + 's');
        el.classList.add('in');
      } else {
        still.push(el);
      }
    }
    pending = still;
  }

  /* ---- the reading rule, and the house resolving -------------------------
     One rAF loop, one layout pass per frame, the result expressed as custom
     properties so the drawing itself stays in CSS.                         */
  var ticking = false;
  var lastY = window.scrollY;
  var sitting = false;
  var sittingTop = true;   /* she starts the page sat down */
  var stillTimer = null;

  function frame() {
    ticking = false;
    var vh = window.innerHeight;

    var max = root.scrollHeight - vh;
    var p = max > 0 ? window.scrollY / max : 1;
    if (p < 0) p = 0; else if (p > 1) p = 1;   /* rubber-band overscroll */
    root.style.setProperty('--scroll', p.toFixed(4));

    /* The spaniel walks on --scroll alone; all this adds is which way she
       faces and whether her legs are moving. */
    if (spaniel) {
      /* She is forest green, which disappears on the two dark grounds, so
         she picks up the paper ink whenever she crosses onto one. */
      var box = spaniel.getBoundingClientRect();
      var mid = box.top + box.height / 2, onDark = false, k;
      for (k = 0; k < darkGrounds.length; k++) {
        var g = darkGrounds[k].getBoundingClientRect();
        if (g.top < mid && g.bottom > mid) { onDark = true; break; }
      }
      spaniel.classList.toggle('on-dark', onDark);
      /* She sits once the cake has actually arrived on her ground line —
         a geometric test rather than a scroll percentage, so it lands at the
         right moment whatever the page length or viewport. Overscroll only
         lifts the cake further, so the test stays true through a bounce:
         on a phone the rubber-band was nudging scrollY back and forth and
         turning her round to face back up the page just as she got there. */
      if (cake) {
        var pawY = box.bottom + box.height * 0.118;   /* empty box below her paws */
        var cakeBottom = cake.getBoundingClientRect().bottom;
        /* Two thresholds, deliberately far apart. She sits the moment the
           cake lands, but will not get up again until the page has genuinely
           been scrolled away — a phone's rubber-band can bounce fifty pixels
           or more, and a single threshold had her standing and turning round
           on every bounce. */
        if (!sitting)      sitting = cakeBottom <= pawY + 4;
        else if (sitting)  sitting = cakeBottom <= pawY + 12;
      }
      /* She starts the page sat down too, facing the way she is about to go.
         Same shape of test as at the cake: a couple of pixels to sit, a few
         more before she gets up, so the top does not flicker between poses. */
      if (!sittingTop) sittingTop = window.scrollY <= 4;
      else             sittingTop = window.scrollY <= 24;

      spaniel.dataset.phase = sittingTop ? 'sit-start'
                            : sitting    ? 'sit-end'
                            : 'walk';

      /* Facing is pinned at both ends of the page. A rubber-band bounce never
         takes scrollY past either limit, so this holds her steady through one
         — but scroll a few pixels off the bottom and she turns round, still
         sitting, and then gets up and walks back. */
      var atEnd = window.scrollY >= max - 4;
      var atStart = window.scrollY <= 4;
      var y = window.scrollY;
      if (!atEnd && !atStart && y !== lastY) {
        if (y > lastY) spaniel.style.setProperty('--sp-dir', '1');
        else if (y < lastY) spaniel.style.setProperty('--sp-dir', '-1');
        spaniel.classList.add('running');
        clearTimeout(stillTimer);
        stillTimer = setTimeout(function () { spaniel.classList.remove('running'); }, 160);
      }
      if (atEnd || atStart) {
        spaniel.style.setProperty('--sp-dir', '1');
      }
      if (sitting || sittingTop) spaniel.classList.remove('running');
      lastY = y;
    }

    sweep();
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  if (!reduced.matches) {
    Array.prototype.forEach.call(toReveal, function (el) {
      el.classList.add('reveal');
      pending.push(el);
    });

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    addEventListener('scrollend', onScroll, { passive: true });
    addEventListener('hashchange', onScroll);

    /* Let the .reveal styles commit before the first sweep, so anything
       already on screen animates in rather than simply appearing. The
       delayed passes catch a landing position that arrives late — a deep
       link to #travel, a restored scroll offset, or a webfont reflow —
       none of which necessarily fire a scroll event. */
    requestAnimationFrame(frame);

    /* A scroll event is not a reliable trigger on its own: a programmatic
       jump can land a frame ahead of the event, leaving a section blank
       until something else happens. This low-frequency poll makes the
       reveal deterministic whatever moved the page, and clears itself the
       moment the last section is in. */
    pump = setInterval(sweep, 120);
  }

  /* ---- the card resting on a surface -------------------------------------
     Six pixels of movement, and only for a real pointer.                   */
  if (card && stage && fine.matches && !reduced.matches) {
    stage.addEventListener('pointermove', function (ev) {
      var r = stage.getBoundingClientRect();
      card.style.setProperty('--tx', (((ev.clientX - r.left) / r.width  - 0.5) * 5).toFixed(2));
      card.style.setProperty('--ty', (((ev.clientY - r.top)  / r.height - 0.5) * 4).toFixed(2));
    });
    stage.addEventListener('pointerleave', function () {
      card.style.setProperty('--tx', 0);
      card.style.setProperty('--ty', 0);
    });
  }


  /* ---- the postal address ------------------------------------------------
     Composed into the guest's own mail app. Nothing is posted anywhere and
     nothing is stored, so there is no backend to keep alive until 2027.
     Without JavaScript the form's mailto action still opens a mail client,
     and the plain address link below it always works.                      */
  var form = document.querySelector('.addr-form');
  if (form) {
    var status = form.querySelector('.addr-status');
    var to = (form.getAttribute('action') || '').replace(/^mailto:/, '');

    form.addEventListener('submit', function (ev) {
      if (!form.reportValidity || !form.reportValidity()) return;
      ev.preventDefault();

      var val = function (n) {
        var el = form.elements[n];
        return el && el.value ? el.value.trim() : '';
      };
      var name = val('name');
      var body = 'Name\n' + name +
                 '\n\nPostal address\n' + val('address') +
                 (val('email') ? '\n\nEmail\n' + val('email') : '') +
                 '\n';

      window.location.href = 'mailto:' + to +
        '?subject=' + encodeURIComponent('Address for the invitation — ' + name) +
        '&body=' + encodeURIComponent(body);

      if (status) {
        status.textContent = 'Opening your mail app — press send and it reaches us.';
      }
    });
  }


  /* ---- the gate ----------------------------------------------------------
     The password is stored as a SHA-256 hash rather than in the clear, so it
     is not sitting in the source to be read at a glance. That is the only
     thing it buys: the page itself is still a public file, and anyone who
     wants the content can fetch it directly. This keeps the page out of
     search results and casual visitors out of the page. To change the
     password, run this in any browser console and paste the result below:

       crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourword'))
         .then(b => console.log([...new Uint8Array(b)]
           .map(x => x.toString(16).padStart(2,'0')).join('')))
     ------------------------------------------------------------------- */
  var PASSWORD_SHA256 =
    '5b1c2bb11aca1871d1703c8128d1c81ca2acb9e78d703fc2acf60102484df4e8';

  var gate = document.querySelector('.gate');
  if (gate) {
    var field = gate.querySelector('.gate-pw');
    var note  = gate.querySelector('.gate-msg');

    var sha256 = function (text) {
      var enc = new TextEncoder().encode(text);
      return crypto.subtle.digest('SHA-256', enc).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      });
    };

    var unlock = function () {
      try { sessionStorage.setItem('invercharron', 'ok'); } catch (e) {}
      root.classList.remove('locked');
      /* the page was display:none while locked, so nothing had measurable
         geometry — recalculate now that it does */
      requestAnimationFrame(function () { onScroll(); sweep(); });
    };

    var refuse = function () {
      gate.classList.add('wrong');
      note.textContent = 'Not quite. Try again.';
      note.classList.add('show');
      field.select();
      setTimeout(function () { gate.classList.remove('wrong'); }, 500);
    };

    gate.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var typed = field.value.trim().toLowerCase();
      if (!typed) return;
      if (!window.crypto || !crypto.subtle) {   /* very old browser, or http:// */
        note.textContent = 'This browser cannot check the password.';
        note.classList.add('show');
        return;
      }
      sha256(typed).then(function (hash) {
        if (hash === PASSWORD_SHA256) unlock(); else refuse();
      }).catch(refuse);
    });

    if (root.classList.contains('locked')) field.focus();
  }

  /* ---- if the setting changes mid-visit, respect it immediately ---------- */
  reduced.addEventListener('change', function () { location.reload(); });
})();
