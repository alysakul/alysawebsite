(function () {
  'use strict';

  /* ---------- floating head (hover-to-rotate self portrait) ---------- */

  var portrait = document.getElementById('portraitFrame');
  if (portrait) {
    var HEAD_COLS = 6;
    var HEAD_ROWS = 4;
    var HEAD_FRAME_COUNT = 23;
    var HEAD_INTERVAL = 70;
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
