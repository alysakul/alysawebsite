(function () {
  'use strict';

  /* ---------- floating head (hover-to-rotate self portrait) ---------- */

  var HEAD_COLS = 6;
  var HEAD_ROWS = 4;
  var HEAD_FRAME_COUNT = 23;
  var HEAD_INTERVAL = 70;

  Array.prototype.forEach.call(document.querySelectorAll('[data-head]'), function (portrait) {
    var headFrame = 0;
    var headTimer = null;

    function setHeadFrame(i) {
      var col = i % HEAD_COLS;
      var row = Math.floor(i / HEAD_COLS);
      var xPct = (col / (HEAD_COLS - 1)) * 100;
      var yPct = (row / (HEAD_ROWS - 1)) * 100;
      portrait.style.backgroundPosition = xPct + '% ' + yPct + '%';
    }

    portrait.addEventListener('mouseenter', function () {
      if (headTimer) clearInterval(headTimer);
      headTimer = setInterval(function () {
        headFrame = (headFrame + 1) % HEAD_FRAME_COUNT;
        setHeadFrame(headFrame);
      }, HEAD_INTERVAL);
    });

    portrait.addEventListener('mouseleave', function () {
      if (headTimer) {
        clearInterval(headTimer);
        headTimer = null;
      }
      if (portrait.classList.contains('portrait-frame--logo')) {
        headFrame = 0;
        setHeadFrame(headFrame);
      }
    });
  });

  /* ---------- hero video: paused on the title card until clicked ---------- */

  var heroVideos = document.querySelectorAll('[data-hero-video]');
  Array.prototype.forEach.call(heroVideos, function (wrap) {
    var video = wrap.querySelector('video');

    wrap.addEventListener('click', function () {
      if (wrap.classList.contains('is-playing')) return;
      wrap.classList.add('is-playing');
      video.controls = true;
      video.play();
    });

    // when it finishes, go back to the title card
    video.addEventListener('ended', function () {
      wrap.classList.remove('is-playing');
      video.controls = false;
      video.load();
    });
  });

  /* ---------- header takes on the colour of the section under it ---------- */

  var header = document.querySelector('.site-header');
  /* every full-width coloured band on the site; a band whose colour isn't a plain
     background (e.g. a border-image fill) can declare it with --header-tint */
  var tinted = document.querySelectorAll('.tinted-section, .hmw-banner, .doc-hero');

  if (header && tinted.length) {
    var ticking = false;

    var updateHeaderTint = function () {
      ticking = false;
      var probe = header.getBoundingClientRect().height / 2;
      var color = '';
      for (var i = 0; i < tinted.length; i++) {
        var r = tinted[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom >= probe) {
          var cs = window.getComputedStyle(tinted[i]);
          color = cs.getPropertyValue('--header-tint').trim() || cs.backgroundColor;
          break;
        }
      }
      header.style.backgroundColor = color;

      /* switch the nav text to light when the band behind it is dark */
      var m = color.match(/\d+(\.\d+)?/g);
      var dark = false;
      if (m && m.length >= 3) {
        dark = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) < 128;
      }
      header.classList.toggle('is-on-dark', dark);
    };

    var requestUpdate = function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateHeaderTint);
      }
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    updateHeaderTint();
  }

  /* ---------- hamburger dropdown for the nav on mobile (styled in css/style.css) ---------- */

  var siteNav = header && header.querySelector('.site-nav');

  if (siteNav) {
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-toggle';
    toggle.setAttribute('aria-label', 'Menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span class="nav-toggle__bar"></span><span class="nav-toggle__bar"></span><span class="nav-toggle__bar"></span>';

    siteNav.id = siteNav.id || 'site-nav';
    toggle.setAttribute('aria-controls', siteNav.id);
    header.appendChild(toggle);
    header.classList.add('has-menu');

    var setMenu = function (open) {
      header.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    toggle.addEventListener('click', function () {
      setMenu(!header.classList.contains('menu-open'));
    });

    document.addEventListener('click', function (e) {
      if (!header.contains(e.target)) setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });

    window.matchMedia('(min-width: 701px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- fade transition between pages ---------- */

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    var href = link.getAttribute('href');
    if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 ||
        href.indexOf('http://') === 0 || href.indexOf('https://') === 0 ||
        href.indexOf('//') === 0) {
      return;
    }

    e.preventDefault();
    document.body.classList.add('page-fade-out');
    setTimeout(function () {
      window.location.href = href;
    }, 400);
  });

  /* Guard against the back/forward cache restoring a page mid-fade-out
     (class still attached from the click that navigated away from it),
     which would otherwise leave it stuck invisible. */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.body.classList.remove('page-fade-out');
    }
  });
})();
