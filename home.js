// Homepage interactivity (only loaded by index.qmd).
// Site-wide effects (navbar, scroll reveal, progress bar) live in _site-scripts.html.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;

  /* ---------- 1. Typing effect ---------- */
  var roles = ["hardware.", "electro-mechanical systems.", "precision machined parts.", "embedded systems.", "things that move."];
  var typed = document.getElementById("typed-role");
  if (typed && !reduce) {
    var r = 0, i = roles[0].length, deleting = true;
    (function tick() {
      var word = roles[r];
      i += deleting ? -1 : 1;
      typed.textContent = word.slice(0, i);
      var delay = deleting ? 40 : 85;
      if (!deleting && i === word.length) { deleting = true; delay = 1900; }
      else if (deleting && i === 0) { deleting = false; r = (r + 1) % roles.length; delay = 320; }
      setTimeout(tick, delay);
    })();
  }

  /* ---------- 2. Cursor-following glow on glass panels ---------- */
  if (canHover) {
    document.querySelectorAll(".hx-glass").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var b = el.getBoundingClientRect();
        el.style.setProperty("--gx", e.clientX - b.left + "px");
        el.style.setProperty("--gy", e.clientY - b.top + "px");
      });
    });
  }

  /* ---------- 3. 3D tilt on the headshot card ---------- */
  var photo = document.querySelector("[data-tilt]");
  if (photo && canHover && !reduce) {
    photo.addEventListener("pointermove", function (e) {
      var b = photo.getBoundingClientRect();
      var x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
      photo.style.transform = "perspective(900px) rotateX(" + (-y * 10) + "deg) rotateY(" + (x * 10) + "deg)";
    });
    photo.addEventListener("pointerleave", function () { photo.style.transform = ""; });
  }

  /* ---------- 5. Reveal project cards and lab cards on scroll ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-visible"); rio.unobserve(en.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll(".hx-proj, .hx-lab").forEach(function (el, k) {
      el.classList.add("reveal");
      if (el.classList.contains("hx-lab")) el.style.transitionDelay = (k % 4) * 80 + "ms";
      rio.observe(el);
    });
  }

  /* ---------- 6. Infinite, draggable experience carousel ---------- */
  var wrap = document.querySelector(".hx-carousel");
  var track = wrap && wrap.querySelector(".hx-track");
  if (wrap && track) {
    var originals = Array.prototype.slice.call(track.children);
    var setWidth = 0, x = 0, speed = reduce ? 0 : 0.45; // px per frame (~27px/s)
    var target = speed, current = speed, dragging = false, moved = 0, startX = 0, startPos = 0, lastX = 0, vel = 0;

    function measure() {
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      setWidth = originals.reduce(function (sum, el) { return sum + el.offsetWidth + gap; }, 0);
    }
    function fill() {
      // clone sets until the track covers the viewport twice
      Array.prototype.slice.call(track.querySelectorAll("[data-clone]")).forEach(function (c) { c.remove(); });
      measure();
      var copies = Math.max(2, Math.ceil((wrap.offsetWidth * 2) / setWidth) + 1);
      for (var c = 0; c < copies; c++) {
        originals.forEach(function (el) {
          var k = el.cloneNode(true);
          k.setAttribute("data-clone", ""); k.setAttribute("aria-hidden", "true"); k.tabIndex = -1;
          track.appendChild(k);
        });
      }
    }
    function wrapX() {
      if (setWidth <= 0) return;
      while (x <= -setWidth) x += setWidth;
      while (x > 0) x -= setWidth;
    }
    function render() {
      track.style.transform = "translate3d(" + x + "px,0,0)";
      // scale & fade cards by distance from the centre
      var wb = wrap.getBoundingClientRect(), mid = wb.left + wb.width / 2, half = wb.width / 2;
      Array.prototype.forEach.call(track.children, function (card) {
        var b = card.getBoundingClientRect();
        var d = Math.min(Math.abs(b.left + b.width / 2 - mid) / half, 1);
        card.style.setProperty("--scale", (1.04 - 0.14 * d).toFixed(3));
        card.style.setProperty("--fade", (1 - 0.45 * d).toFixed(3));
      });
    }
    function loop() {
      if (!dragging) {
        current += (target - current) * 0.06;           // ease speed changes (hover pause)
        vel *= 0.94;                                     // momentum after a drag
        x -= current + vel;
        wrapX();
      }
      render();
      requestAnimationFrame(loop);
    }

    wrap.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") target = 0; });
    wrap.addEventListener("pointerleave", function () { target = speed; });
    wrap.addEventListener("pointerdown", function (e) {
      dragging = true; moved = 0; startX = lastX = e.clientX; startPos = x; vel = 0;
      wrap.classList.add("is-dragging");
      wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      x = startPos + (e.clientX - startX);
      vel = lastX - e.clientX; lastX = e.clientX;
      moved = Math.max(moved, Math.abs(e.clientX - startX));
      wrapX();
    });
    function endDrag() { dragging = false; wrap.classList.remove("is-dragging"); }
    wrap.addEventListener("pointerup", endDrag);
    wrap.addEventListener("pointercancel", endDrag);
    // a drag should not count as a click on a card
    wrap.addEventListener("click", function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    wrap.addEventListener("dragstart", function (e) { e.preventDefault(); });

    var resizeTimer;
    window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { fill(); wrapX(); }, 150); });
    window.addEventListener("load", function () { fill(); wrapX(); });
    fill();
    x = -(setWidth - wrap.offsetWidth / 2 + (originals[0].offsetWidth / 2)); // start with card 1 centred
    wrapX();
    requestAnimationFrame(loop);
  }

  /* ---------- 7. Labs rail arrows ---------- */
  var rail = document.querySelector(".hx-rail");
  if (rail) {
    var btns = document.querySelectorAll(".hx-rail-btn");
    function update() {
      btns[0].disabled = rail.scrollLeft < 8;
      btns[1].disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8;
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        rail.scrollBy({ left: +b.dataset.dir * rail.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
      });
    });
    rail.addEventListener("scroll", update, { passive: true });
    update();
  }
})();
