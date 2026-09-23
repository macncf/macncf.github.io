/* ==========================================================================
   Joshua & Freddy — Invercharron
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
  var legs        = document.querySelectorAll('.gr-leg');
  var champagne   = document.querySelector('.champagne');
  var champSec    = document.querySelector('.address');
  var POP         = [0.32, 0.38, 0.44, 0.52, 0.62, 0.72, 0.82];
                    /* seven thresholds, eight states. Uneven on purpose:
                       a long hold sealed, three states in quick succession
                       through the pop, then slower as the cork falls and
                       settles. An even eight-beat reads as a metronome. */
  var popped      = 1;
  var champWarm   = false;
  var SWING       = 0.53;   /* swing amplitude, radians (~30 degrees) */
  var PHASE       = 2.1;    /* how far out of step the two of them are */
  var PERSP       = 0.045;  /* nearer on the forward half of the arc   */
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
    '.addr-send, .addr-alt'
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

    /* The champagne stands on the seam at the top of the address section, so
       that seam's distance up the viewport is the whole clock: closed as it
       appears at the bottom, spraying by the time it reaches the top. The
       holds are deliberately uneven — a long wait, then three states in quick
       succession — because an even four-beat reads as a metronome rather than
       a pop. It only ever moves forward; a cork does not go back in. It
       re-arms if you scroll far enough back for the section to drop below the
       fold again. */
    if (champagne && champSec && !reduced.matches) {
      var champBox = champSec.getBoundingClientRect();

      /* A mask image on a display:none layer is never fetched, so the three
         unseen states would each arrive late and the pop would stutter the
         first time through. Warm them a couple of screens out, once. */
      if (!champWarm && champBox.top < window.innerHeight * 2.5) {
        champWarm = true;
        for (var f = 2; f <= 8; f++) { new Image().src = 'champagne-' + f + '.png'; }
      }

      var p = 1 - champBox.top / window.innerHeight;
      if (p <= 0) {
        popped = 1;
      } else {
        var want = 1;
        for (var k = 0; k < POP.length; k++) { if (p >= POP[k]) { want = k + 2; } }
        if (want > popped) popped = want;
      }
      if (+champagne.getAttribute('data-pop') !== popped) {
        champagne.setAttribute('data-pop', popped);
      }
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

  /* ---- the legs, swinging ------------------------------------------------
     They used to swing on scroll and hold wherever you stopped; now they keep
     going on their own. THETA is the swing angle; what reaches the page is the
     apparent length of a leg at that angle, cos(theta), which is what
     foreshortening does to a leg swung towards or away from you. PERSP adds a
     little on the near half of the arc and takes it off the far half, so
     swinging forward does not look identical to swinging back. The two of them
     run on different phases — one kicks forward as the other comes back.

     Done in JS rather than @keyframes because the shape of the motion is that
     cosine, not an ease: the feet bob at twice the frequency of the swing and
     sit lowest as the legs pass vertical, which is the whole cue that they are
     dangling rather than sweeping side to side.

     The loop only runs while they are actually on screen — an observer starts
     and stops it — so nothing turns over while you are reading the rest. */
  if (legs.length && !reduced.matches) {
    var PERIOD = 2.6;               /* seconds for a full swing, there and back */
    var swinging = false, swingRAF = null;

    var swing = function (now) {
      var t = (now / 1000) * (Math.PI * 2 / PERIOD);
      for (var i = 0; i < legs.length; i++) {
        var theta = SWING * Math.sin(t + i * PHASE);
        legs[i].style.setProperty('--gr-kick',
          (Math.cos(theta) * (1 + PERSP * Math.sin(theta))).toFixed(4));
      }
      if (swinging) swingRAF = requestAnimationFrame(swing);
    };

    var grooms = document.querySelector('.grooms');
    if (grooms && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var on = entries[0].isIntersecting;
        if (on === swinging) return;
        swinging = on;
        if (on) swingRAF = requestAnimationFrame(swing);
        else { cancelAnimationFrame(swingRAF); swingRAF = null; }
      }, { rootMargin: '120px' }).observe(grooms);
    } else {
      swinging = true;
      swingRAF = requestAnimationFrame(swing);
    }
  }

  /* ---- the card resting on a surface -------------------------------------
     A card of stock this size does not stay flat under your hand: it tips,
     lifts, catches the light along the near edge and the far edges roll away
     from you. Four numbers carry all of it to CSS —

       --tx, --ty   the tilt, in degrees
       --mx, --my   where the pointer is, 0 to 1 across the card

     — and everything else is drawn in the stylesheet. Written on a rAF so a
     fast pointer cannot queue up more style writes than there are frames. */
  if (card && stage && fine.matches && !reduced.matches) {
    var tilting = false, px = 0, py = 0;

    var applyTilt = function () {
      tilting = false;
      card.style.setProperty('--tx', ((px - 0.5) * 9).toFixed(2));
      card.style.setProperty('--ty', ((py - 0.5) * 7).toFixed(2));
      card.style.setProperty('--mx', px.toFixed(3));
      card.style.setProperty('--my', py.toFixed(3));
    };

    stage.addEventListener('pointermove', function (ev) {
      /* Measured across the CARD, not the stage around it. The stage is half
         as wide again, so normalising against it spent most of the range on
         empty paper either side and the card barely moved under your hand. */
      var r = card.getBoundingClientRect();
      px = (ev.clientX - r.left) / r.width;
      py = (ev.clientY - r.top) / r.height;
      if (px < 0) px = 0; else if (px > 1) px = 1;
      if (py < 0) py = 0; else if (py > 1) py = 1;
      card.classList.add('lifted');
      if (!tilting) { tilting = true; requestAnimationFrame(applyTilt); }
    });

    stage.addEventListener('pointerleave', function () {
      card.classList.remove('lifted');
      card.style.setProperty('--tx', 0);
      card.style.setProperty('--ty', 0);
      card.style.setProperty('--mx', 0.5);
      card.style.setProperty('--my', 0.5);
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

    /* The same hash in plain JavaScript, for when the browser will not lend
       its own: crypto.subtle only exists on secure (https) pages, and Safari
       does not upgrade a typed http:// address the way Chrome does. The head
       script redirects to https, but this means the gate cannot fail
       whichever way a guest arrives. Checked against the browser's own
       result and the standard "abc" test vector. */
    var sha256js = function (msg) {
      var ror = function (x, n) { return (x >>> n) | (x << (32 - n)); };
      var K = [], H = [], i, j, n, c;
      var isPrime = function (v) { for (var f = 2; f * f <= v; f++) if (v % f === 0) return false; return true; };
      var frac = function (x) { return ((x - Math.floor(x)) * 4294967296) | 0; };
      for (n = 2, c = 0; c < 64; n++) if (isPrime(n)) {
        if (c < 8) H[c] = frac(Math.pow(n, 1 / 2));
        K[c++] = frac(Math.pow(n, 1 / 3));
      }
      var str = unescape(encodeURIComponent(msg)), len = str.length, words = [];
      for (i = 0; i < len; i++) words[i >> 2] |= str.charCodeAt(i) << (24 - (i % 4) * 8);
      words[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
      words[((len + 8 >> 6) << 4) + 15] = len * 8;
      for (i = 0; i < words.length; i += 16) {
        /* Copied word by word, not sliced: the array has gaps, and a gap is
           undefined, which turns the sums below into NaN. `| 0` makes it 0. */
        var w = [], a = H.slice(0);
        for (j = 0; j < 16; j++) w[j] = words[i + j] | 0;
        for (j = 0; j < 64; j++) {
          if (j >= 16) {
            var w15 = w[j - 15], w2 = w[j - 2];
            w[j] = (w[j - 16] + (ror(w15, 7) ^ ror(w15, 18) ^ (w15 >>> 3)) + w[j - 7] +
                    (ror(w2, 17) ^ ror(w2, 19) ^ (w2 >>> 10))) | 0;
          }
          var e = a[4];
          var t1 = (a[7] + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & a[5]) ^ (~e & a[6])) +
                    K[j] + (w[j] | 0)) | 0;
          var t2 = ((ror(a[0], 2) ^ ror(a[0], 13) ^ ror(a[0], 22)) +
                    ((a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]))) | 0;
          a = [(t1 + t2) | 0].concat(a);
          a[4] = (a[4] + t1) | 0;
          a.pop();
        }
        for (j = 0; j < 8; j++) H[j] = (H[j] + a[j]) | 0;
      }
      return H.map(function (h) { return ('00000000' + (h >>> 0).toString(16)).slice(-8); }).join('');
    };

    var hashOf = function (text) {
      if (window.crypto && crypto.subtle && window.TextEncoder) {
        return sha256(text).catch(function () { return sha256js(text); });
      }
      return Promise.resolve(sha256js(text));
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

    var attempt = function () {
      var typed = field.value.trim().toLowerCase();
      if (!typed) return;
      hashOf(typed).then(function (hash) {
        if (hash === PASSWORD_SHA256) unlock(); else refuse();
      }).catch(refuse);
    };

    gate.addEventListener('submit', function (ev) { ev.preventDefault(); attempt(); });

    /* Belt and braces. The submit button above should be enough to make every
       keyboard's return key submit, but phone keyboards vary and there is no
       second chance if one of them decides its return key only closes itself. */
    field.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.keyCode === 13) { ev.preventDefault(); attempt(); }
    });

    if (root.classList.contains('locked')) field.focus();
  }

  /* ---- click the dog -----------------------------------------------------
     She speaks on a plain click, and also part-way through a press, so that
     holding her works without waiting for you to let go. Whichever comes
     first wins; `spoke` stops the second one firing twice. Text only — there
     is no audio anywhere on this page. */
  var SAY_HOLD = 550;    /* a held press speaks at this point, without release */
  var SAY_SHOW = 1900;   /* how long she says it for */
  if (spaniel) {
    var sayTimer = null, sayHide = null, spoke = false;

    var speak = function () {
      spoke = true;
      clearTimeout(sayTimer); sayTimer = null;
      spaniel.classList.add('saying');
      clearTimeout(sayHide);
      sayHide = setTimeout(function () { spaniel.classList.remove('saying'); }, SAY_SHOW);
    };
    var cancelHold = function () { clearTimeout(sayTimer); sayTimer = null; };

    spaniel.addEventListener('pointerdown', function () {
      spoke = false;
      cancelHold();
      sayTimer = setTimeout(speak, SAY_HOLD);
    });
    spaniel.addEventListener('pointerup', function () {
      cancelHold();
      if (!spoke) speak();          /* a quick click counts too */
    });
    ['pointercancel', 'pointerleave'].forEach(function (e) {
      spaniel.addEventListener(e, cancelHold);
    });
    /* a long press on a phone otherwise raises the image/share menu */
    spaniel.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  }

  /* ---- if the setting changes mid-visit, respect it immediately ---------- */
  reduced.addEventListener('change', function () { location.reload(); });
})();
