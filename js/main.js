/*
 * Mrs Me — Birthday site
 * Plain JavaScript, no build step, no libraries.
 * Sections: helpers · shared input · intro · heart taps · scroll reveal ·
 *           reason cards · letter · photo story · hero gallery ·
 *           3D motion (hero + background) · countdown
 */
(function () {
  "use strict";

  /* ---------- helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };
  var pad2 = function (n) { return String(n).padStart(2, "0"); };

  /** Hide the broken-image icon if a photo file is missing. */
  function guardImage(img) {
    img.addEventListener("error", function () { img.classList.add("is-missing"); });
    img.addEventListener("load", function () { img.classList.remove("is-missing"); });
  }

  /* ---------- shared input (pointer / tilt / scroll) ---------- */
  var input = { scroll: window.scrollY || 0, tiltX: 0, tiltY: 0 };

  window.addEventListener("scroll", function () { input.scroll = window.scrollY; }, { passive: true });
  window.addEventListener("pointermove", function (e) {
    input.tiltX = (e.clientX / window.innerWidth - 0.5) * 2;
    input.tiltY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  window.addEventListener("deviceorientation", function (e) {
    if (e.gamma == null && e.beta == null) return; // desktop browsers send empty events
    input.tiltX = clamp((e.gamma || 0) / 35, -1, 1);
    input.tiltY = clamp(((e.beta || 0) - 40) / 40, -1, 1);
  });

  /* ==========================================================================
     Opening reveal
     ========================================================================== */
  function initIntro() {
    var intro = $("#intro");
    var site = $("#site");
    var btn = $("#intro-open");
    var leaving = false;
    if (!intro || !btn) return;

    btn.addEventListener("click", function () {
      if (leaving) return;
      leaving = true;
      intro.classList.add("is-leaving");
      window.setTimeout(function () {
        intro.remove();
        document.body.classList.remove("intro-open");
        site.removeAttribute("inert");
        site.classList.add("is-entered");
      }, 700);
    });
  }

  /* ==========================================================================
     Every tap / click releases a floating heart
     ========================================================================== */
  function initHeartTaps() {
    var layer = $("#heart-layer");
    var EMOJIS = ["❤️", "🥹", "💖", "🌹", "✨", "💍"];
    if (!layer) return;

    window.addEventListener("pointerdown", function (e) {
      var pop = document.createElement("span");
      pop.className = "heart-pop";
      pop.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      pop.style.left = e.clientX + "px";
      pop.style.top = e.clientY + "px";
      pop.style.setProperty("--drift", (Math.random() - 0.5) * 120 + "px");
      layer.appendChild(pop);
      while (layer.children.length > 19) layer.removeChild(layer.firstChild);
      window.setTimeout(function () { pop.remove(); }, 1500);
    });
  }

  /* ==========================================================================
     Reveal elements in 3D as they scroll into view
     ========================================================================== */
  function initReveal() {
    var els = $$(".reveal");
    els.forEach(function (el) {
      el.style.setProperty("--delay", (el.getAttribute("data-delay") || 0) + "ms");
    });

    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-shown"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-shown");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ==========================================================================
     Reason cards (tap to flip)
     ========================================================================== */
  function initReasonCards() {
    $$(".flip-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var on = card.classList.toggle("is-flipped");
        card.setAttribute("aria-pressed", String(on));
      });
    });
  }

  /* ==========================================================================
     Love letter
     ========================================================================== */
  function initLetter() {
    var btn = $("#letter-open");
    var body = $("#letter-body");
    if (!btn || !body) return;
    btn.addEventListener("click", function () {
      btn.hidden = true;
      body.hidden = false;
    });
  }

  /* ==========================================================================
     Photo story: one memory in focus + tappable filmstrip
     ========================================================================== */
  function initPhotoStory() {
    var img = $("#story-img");
    var count = $("#story-count");
    var caption = $("#story-caption");
    var thumbsBox = $("#story-thumbs");
    var N = PHOTOS.length;
    var active = 0;
    if (!img || !N) return;

    guardImage(img);
    thumbsBox.style.setProperty("--cols", N);

    var thumbs = PHOTOS.map(function (photo, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "thumb";
      b.setAttribute("aria-label", "Show photo " + (i + 1) + ": " + photo.caption);
      var t = new Image();
      t.src = photo.url;
      t.alt = "";
      t.loading = "lazy";
      guardImage(t);
      b.appendChild(t);
      b.addEventListener("click", function () { show(i); });
      thumbsBox.appendChild(b);
      return b;
    });

    function show(i) {
      active = (i + N) % N;
      var p = PHOTOS[active];
      img.src = p.url;
      img.alt = p.alt;
      // restart the fade-in animation
      img.classList.remove("photo-enter");
      void img.offsetWidth;
      img.classList.add("photo-enter");
      count.textContent = "Memory " + pad2(active + 1) + " / " + pad2(N);
      caption.textContent = p.caption;
      thumbs.forEach(function (b, idx) {
        b.classList.toggle("is-active", idx === active);
        b.setAttribute("aria-pressed", String(idx === active));
      });
    }

    $("#story-prev").addEventListener("click", function () { show(active - 1); });
    $("#story-next").addEventListener("click", function () { show(active + 1); });
    show(0);
  }

  /* ==========================================================================
     Hero gallery: full-screen featured photo + floating thumbnail cards
     ========================================================================== */
  function initHeroGallery() {
    var hero = $("#hero");
    var backdrop = $(".hero-backdrop", hero);
    var overlay = $(".hero-image-overlay", hero);
    var N = PHOTOS.length;
    if (!hero || !N) return;

    var MOBILE_SLOTS = [
      { x: -0.29, y: 0.4, rotate: -5 },
      { x: 0.0, y: 0.43, rotate: 0 },
      { x: 0.29, y: 0.4, rotate: 5 }
    ];
    var AUTOPLAY_MS = 5200;
    var RESUME_MS = 6000;

    var size = { w: hero.clientWidth || 1200, h: hero.clientHeight || 800 };
    var active = 0;
    var paused = false;
    var pointer = { x: 0, y: 0 };
    var bp = breakpoint();
    var autoTimer = null;
    var resumeTimer = null;
    var frame = 0;

    function breakpoint() {
      var w = window.innerWidth;
      return w < 700 ? "mobile" : w < 1100 ? "tablet" : "desktop";
    }

    var cards = PHOTOS.map(function (photo, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-card";

      var im = new Image();
      im.src = photo.url;
      im.alt = photo.alt;
      im.draggable = false;
      im.loading = i === 0 ? "eager" : "lazy";
      if (i === 0) im.setAttribute("fetchpriority", "high");
      guardImage(im);
      btn.appendChild(im);

      btn.addEventListener("click", function () { hold(); setActive(i); });
      btn.addEventListener("pointerenter", hold);
      btn.addEventListener("focus", hold);

      hero.insertBefore(btn, overlay);
      return btn;
    });

    function layout() {
      var visible = bp === "desktop" ? 5 : 3;
      var card;
      if (bp === "mobile") {
        card = { w: 104, h: 140 };
      } else {
        var h = Math.max(104, Math.min(196, (size.h * 0.86 - (visible - 1) * 12) / visible));
        card = { w: Math.round(h * 0.76), h: Math.round(h) };
      }

      var slots;
      if (bp === "mobile") {
        slots = MOBILE_SLOTS.map(function (s) {
          return { x: s.x * size.w, y: s.y * size.h, rotate: s.rotate };
        });
      } else {
        var gap = 12;
        var x = -size.w / 2 + card.w / 2 + (bp === "desktop" ? 40 : 24);
        slots = [];
        for (var k = 0; k < visible; k++) {
          slots.push({ x: x, y: (k - (visible - 1) / 2) * (card.h + gap), rotate: 0 });
        }
      }

      cards.forEach(function (el, i) {
        var rel = (i - active + N) % N;
        var isActive = rel === 0;
        var slotIndex = rel - 1;
        var slot = slots[Math.min(Math.max(slotIndex, 0), slots.length - 1)];
        var hidden = !isActive && slotIndex >= slots.length;
        var depth = isActive ? 0.4 : 1 + (slotIndex % 3) * 0.6;
        var x = (isActive ? 0 : slot.x) + pointer.x * depth * -22;
        var y = (isActive ? 0 : slot.y) + pointer.y * depth * -16;

        el.style.width = (isActive ? size.w : card.w) + "px";
        el.style.height = (isActive ? size.h : card.h) + "px";
        el.style.transform =
          "translate(calc(-50% + " + x.toFixed(1) + "px), calc(-50% + " + y.toFixed(1) + "px)) rotate(" +
          (isActive ? 0 : slot.rotate) + "deg)";

        el.classList.toggle("is-active", isActive);
        el.classList.toggle("is-hidden", hidden);
        el.tabIndex = hidden ? -1 : 0;
        el.setAttribute("aria-pressed", String(isActive));
        el.setAttribute("aria-label", (isActive ? "" : "Feature ") + PHOTOS[i].caption + (isActive ? " (featured)" : ""));
      });

      backdrop.style.backgroundImage = 'url("' + PHOTOS[active].url + '")';
    }

    function requestLayout() {
      if (frame) return;
      frame = requestAnimationFrame(function () { frame = 0; layout(); });
    }

    /* autoplay */
    function startAuto() {
      clearTimeout(autoTimer);
      if (paused) return;
      autoTimer = setTimeout(function () { setActive((active + 1) % N); }, AUTOPLAY_MS);
    }
    function setActive(i) { active = i; layout(); startAuto(); }
    function hold() {
      paused = true;
      clearTimeout(autoTimer);
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () { paused = false; startAuto(); }, RESUME_MS);
    }

    /* pointer parallax */
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width - 0.5;
      pointer.y = (e.clientY - r.top) / r.height - 0.5;
      requestLayout();
    });
    hero.addEventListener("pointerleave", function () {
      pointer.x = 0;
      pointer.y = 0;
      requestLayout();
    });

    /* resize */
    function measure() {
      var r = hero.getBoundingClientRect();
      size = { w: r.width, h: r.height };
      bp = breakpoint();
      requestLayout();
    }
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(hero);
    window.addEventListener("resize", measure);

    /* first paint without animating from zero size */
    hero.classList.add("is-settling");
    measure();
    layout();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { hero.classList.remove("is-settling"); });
    });
    startAuto();
  }

  /* ==========================================================================
     3D motion: hero title tilt + depth-projected hearts & stars background
     ========================================================================== */
  function initMotion() {
    var heroContent = $("#hero-content");
    var cue = $("#hero-cue");
    var canvas = $("#bg-canvas");
    var ctx = canvas && canvas.getContext("2d");

    var COUNT = 84;
    var particles = [];
    var width = 0;
    var height = 0;

    function resetCanvas() {
      if (!canvas) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawHeart(s) {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(s * 0.9, -s * 0.45, s * 0.45, -s * 1.1, 0, -s * 0.45);
      ctx.bezierCurveTo(-s * 0.45, -s * 1.1, -s * 0.9, -s * 0.45, 0, s * 0.35);
      ctx.closePath();
      ctx.fill();
    }

    if (ctx) {
      for (var i = 0; i < COUNT; i++) {
        particles.push({
          x: (Math.random() - 0.5) * 2600,
          y: (Math.random() - 0.5) * 2600,
          z: Math.random() * 1400 + 120,
          size: Math.random() * 16 + 6,
          kind: Math.random() > 0.55 ? "heart" : "star",
          spin: Math.random() * Math.PI,
          spinSpeed: (Math.random() - 0.5) * 0.012
        });
      }
      resetCanvas();
      window.addEventListener("resize", resetCanvas);
    }

    var scroll = 0;
    var tiltX = 0;
    var tiltY = 0;
    var lastHero = "";

    function render() {
      /* ---- hero title ---- */
      if (heroContent) {
        var s = input.scroll;
        var t =
          "rotateY(" + (input.tiltX * 8).toFixed(2) + "deg) rotateX(" + (-input.tiltY * 6).toFixed(2) +
          "deg) translateY(" + (s * -0.12).toFixed(1) + "px)";
        var o = Math.max(0, 1 - s / 700).toFixed(3);
        var key = t + o;
        if (key !== lastHero) {
          lastHero = key;
          heroContent.style.transform = t;
          heroContent.style.opacity = o;
          if (cue) cue.style.opacity = Math.max(0, 1 - s / 250).toFixed(3);
        }
      }

      /* ---- background particles ---- */
      if (ctx) {
        scroll += (input.scroll - scroll) * 0.06;
        tiltX += (input.tiltX - tiltX) * 0.05;
        tiltY += (input.tiltY - tiltY) * 0.05;

        ctx.clearRect(0, 0, width, height);
        var focal = 620;
        var cx = width / 2;
        var cy = height / 2;

        for (var n = 0; n < particles.length; n++) {
          var p = particles[n];
          // scroll pulls the field toward the viewer; wrap depth for infinity
          var z = p.z - ((scroll * 0.55) % 1520);
          if (z < 60) z += 1520;
          if (z > 1580) z -= 1520;

          var scale = focal / z;
          var sx = cx + (p.x + tiltX * 340) * scale;
          var sy = cy + (p.y + tiltY * 260 + scroll * 0.12) * scale;
          if (sx < -80 || sx > width + 80 || sy < -80 || sy > height + 80) continue;

          var sz = p.size * scale * 1.6;
          if (sz < 0.4) continue;
          var depthFade = Math.min(1, Math.max(0, 1 - z / 1600));
          p.spin += p.spinSpeed;

          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(p.spin);
          if (p.kind === "heart") {
            var blue = Math.round(149 - ((p.size % 20) / 20) * 44);
            ctx.fillStyle = "rgba(254,110," + blue + "," + (0.08 + depthFade * 0.28).toFixed(3) + ")";
            ctx.shadowColor = "rgba(254,123,144,0.24)";
            ctx.shadowBlur = sz * 1.6;
            drawHeart(sz);
          } else {
            ctx.fillStyle = "rgba(255,255,255," + (0.2 + depthFade * 0.65).toFixed(3) + ")";
            ctx.shadowColor = "rgba(250,188,216,0.35)";
            ctx.shadowBlur = sz * 2;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.5, sz * 0.22), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }

  /* ==========================================================================
     Countdown to our next milestone
     ========================================================================== */
  function initCountdown() {
    var root = $("#anniversary-countdown");
    if (!root) return;

    var TARGET = new Date("2027-01-15T00:00:00+02:00").getTime();
    var LABEL = "Counting to 15 January";
    var ARRIVED = "It's here — 15 January. Happy anniversary, Mrs Me.";
    var UNITS = ["days", "hours", "minutes", "seconds"];
    var values = [];
    var label = null;
    var arrived = false;

    function build() {
      root.textContent = "";
      label = document.createElement("p");
      label.className = "countdown-label";
      label.textContent = LABEL;
      var grid = document.createElement("div");
      grid.className = "countdown-grid";
      values = UNITS.map(function (u) {
        var cell = document.createElement("div");
        cell.className = "glass-card countdown-cell";
        var v = document.createElement("div");
        v.className = "countdown-value";
        var vt = document.createElement("span");
        vt.className = "text-gold";
        v.appendChild(vt);
        var l = document.createElement("div");
        l.className = "countdown-unit";
        l.textContent = u;
        cell.appendChild(v);
        cell.appendChild(l);
        grid.appendChild(cell);
        return vt;
      });
      root.appendChild(label);
      root.appendChild(grid);
    }

    function tick() {
      var left = TARGET - Date.now();
      if (left <= 0) {
        if (!arrived) {
          arrived = true;
          root.textContent = "";
          var p = document.createElement("p");
          p.className = "countdown-arrived text-gold animate-shimmer";
          p.textContent = ARRIVED;
          root.appendChild(p);
        }
        return;
      }
      var parts = [
        Math.floor(left / 86400000),
        Math.floor((left / 3600000) % 24),
        Math.floor((left / 60000) % 60),
        Math.floor((left / 1000) % 60)
      ];
      parts.forEach(function (v, i) { values[i].textContent = pad2(v); });
    }

    build();
    tick();
    window.setInterval(tick, 1000);
  }

  /* ---------- go ---------- */
  initIntro();
  initHeartTaps();
  initReveal();
  initReasonCards();
  initLetter();
  initPhotoStory();
  initHeroGallery();
  initMotion();
  initCountdown();
})();
