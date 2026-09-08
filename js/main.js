(function () {
  'use strict';

  /* ---------- CTA buttons drift into header nav ---------- */

  var ctaGroup = document.getElementById('ctaGroup');
  var siteNav = document.getElementById('siteNav');
  var docked = false;

  function dockButtons() {
    if (docked) return;
    docked = true;

    var buttons = Array.prototype.slice.call(ctaGroup.querySelectorAll('.cta-btn'));

    var firstRects = buttons.map(function (btn) {
      return btn.getBoundingClientRect();
    });

    buttons.forEach(function (btn) {
      siteNav.appendChild(btn);
      btn.classList.add('is-docked');
    });

    var lastRects = buttons.map(function (btn) {
      return btn.getBoundingClientRect();
    });

    buttons.forEach(function (btn, i) {
      var dx = firstRects[i].left - lastRects[i].left;
      var dy = firstRects[i].top - lastRects[i].top;
      btn.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        buttons.forEach(function (btn) {
          btn.classList.add('is-animating');
          btn.style.transform = '';
        });
      });
    });

    var cleanup = function () {
      buttons.forEach(function (btn) {
        btn.classList.remove('is-animating');
        btn.removeEventListener('transitionend', cleanup);
      });
    };
    buttons[0].addEventListener('transitionend', cleanup);
  }

  ctaGroup.addEventListener('click', function (e) {
    var btn = e.target.closest('.cta-btn');
    if (!btn) return;
    dockButtons();
  });

  /* ---------- skills carousel ---------- */

  var SKILLS = [
    { name: 'ChatGPT', file: 'chatgpt', color: '#000000' },
    { name: 'Claude', file: 'claude', color: '#D97757' },
    { name: 'VS Code', file: 'vscode-color', color: '#007ACC' },
    { name: 'Figma', file: 'figma-color', color: '#F24E1E' },
    { name: 'GitHub', file: 'github', color: '#181717' },
    { name: 'React', file: 'react', color: '#61DAFB' },
    { name: 'Vite', file: 'vite-color', color: '#646CFF' },
    { name: 'Firebase', file: 'firebase-color', color: '#DD2C00' },
    { name: 'Jira', file: 'jira-color', color: '#0052CC' },
    { name: 'WordPress', file: 'wordpress', color: '#21759B' },
    { name: 'Bootstrap', file: 'bootstrap', color: '#7952B3' },
    { name: 'Jest', file: 'jest', color: '#C21325' },
    { name: 'Squarespace', file: 'squarespace', color: '#000000' },
    { name: 'Canva', file: 'canva', color: '#00C4CC' },
    { name: 'Procreate Dreams', file: 'procreate', color: '#6E3AFF' },
    { name: 'Java', file: 'java', color: '#000000' },
    { name: 'JavaScript', file: 'javascript', color: '#F7DF1E' },
    { name: 'HTML', file: 'html', color: '#E34F26' },
    { name: 'CSS', file: 'css', color: '#1572B6' },
    { name: 'SQL', file: 'sql', color: '#4A90D9' },
    { name: 'R', file: 'r-color', color: '#276DC3' }
  ];

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  var shuffled = shuffle(SKILLS);
  var rowCount = 3;
  var rows = [[], [], []];
  shuffled.forEach(function (skill, i) {
    rows[i % rowCount].push(skill);
  });

  var rowsEl = document.getElementById('skillsRows');
  var track = document.getElementById('skillsTrack');
  var detail = document.getElementById('skillsDetail');
  var detailTitle = document.getElementById('skillsDetailTitle');
  var detailBody = document.getElementById('skillsDetailBody');

  var DUPES = 10;

  rows.forEach(function (rowSkills, rowIndex) {
    var rowEl = document.createElement('div');
    rowEl.className = 'skills__row' + (rowIndex === 1 ? ' skills__row--mid' : '');

    for (var d = 0; d < DUPES; d++) {
      rowSkills.forEach(function (skill) {
        var jitterY = (Math.random() * 14 - 7).toFixed(1);
        var jitterR = (Math.random() * 10 - 5).toFixed(1);

        var baseTransform = 'translateY(' + jitterY + 'px) rotate(' + jitterR + 'deg)';

        var item = document.createElement('div');
        item.className = 'skill-item';
        item.dataset.name = skill.name;
        item.dataset.baseTransform = baseTransform;
        item.style.transform = baseTransform;
        item.style.setProperty('--item-color', skill.color);

        var img = document.createElement('img');
        img.src = 'assets/icons/' + skill.file + '.svg';
        img.alt = skill.name;

        item.appendChild(img);
        rowEl.appendChild(item);
      });
    }

    rowsEl.appendChild(rowEl);
  });

  /* infinite drag-to-scroll */

  var isDragging = false;
  var dragMoved = false;
  var startX = 0;
  var startScrollLeft = 0;
  var setWidth = 0;

  function measure() {
    setWidth = rowsEl.scrollWidth / DUPES;
    track.scrollLeft = setWidth * Math.floor(DUPES / 2);
  }

  window.addEventListener('load', measure);
  setTimeout(measure, 300);

  track.addEventListener('pointerdown', function (e) {
    isDragging = true;
    dragMoved = false;
    startX = e.clientX;
    startScrollLeft = track.scrollLeft;
    track.classList.add('is-dragging');
    track.setPointerCapture(e.pointerId);
  });

  track.addEventListener('pointermove', function (e) {
    if (!isDragging) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 3) dragMoved = true;
    track.scrollLeft = startScrollLeft - dx;
  });

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');
    wrapScroll();
  }

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointerleave', endDrag);
  track.addEventListener('pointercancel', endDrag);

  track.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      track.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  track.addEventListener('scroll', wrapScroll);

  function wrapScroll() {
    if (!setWidth) return;
    var maxScroll = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft < setWidth) {
      track.scrollLeft += setWidth;
    } else if (track.scrollLeft > maxScroll - setWidth) {
      track.scrollLeft -= setWidth;
    }
  }

  /* hover: pop, dim siblings, show detail */

  rowsEl.addEventListener('mouseover', function (e) {
    if (isDragging) return;
    var item = e.target.closest('.skill-item');
    if (item) {
      setActive(item);
    } else {
      clearActive();
    }
  });

  rowsEl.addEventListener('mouseleave', function () {
    clearActive();
  });

  var activeItem = null;

  function setActive(item) {
    if (activeItem === item) return;
    if (activeItem) {
      activeItem.classList.remove('is-active');
      activeItem.style.transform = activeItem.dataset.baseTransform;
    }
    activeItem = item;
    item.classList.add('is-active');
    item.style.transform = item.dataset.baseTransform + ' scale(1.4)';
    track.classList.add('has-active');

    var name = item.dataset.name;
    detailTitle.textContent = name;
    detailBody.textContent = 'Projects using ' + name + ' will show up here once the Projects page is built.';
    detail.hidden = false;
  }

  function clearActive() {
    if (activeItem) {
      activeItem.classList.remove('is-active');
      activeItem.style.transform = activeItem.dataset.baseTransform;
    }
    activeItem = null;
    track.classList.remove('has-active');
    detail.hidden = true;
  }

  /* ---------- auto-drift when idle ---------- */

  var DRIFT_SPEED = 0.4;

  function driftTick() {
    if (!isDragging && !activeItem && setWidth) {
      track.scrollLeft += DRIFT_SPEED;
    }
    requestAnimationFrame(driftTick);
  }

  requestAnimationFrame(driftTick);
})();
