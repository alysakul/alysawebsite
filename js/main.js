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
      headFrame = 0;
      setHeadFrame(0);
    });
  }

  /* ---------- skills carousel ---------- */

  if (!document.getElementById('skillsRows')) {
    return;
  }

  var SKILLS = [
    { name: 'ChatGPT', file: 'chatgpt.svg', color: '#000000' },
    { name: 'Claude', file: 'claude.svg', color: '#D97757' },
    { name: 'VS Code', file: 'vscode-color.svg', color: '#007ACC' },
    { name: 'Figma', file: 'figma-color.svg', color: '#F24E1E' },
    { name: 'GitHub', file: 'github.svg', color: '#181717' },
    { name: 'React', file: 'react.svg', color: '#61DAFB' },
    { name: 'Vite', file: 'vite-color.svg', color: '#646CFF' },
    { name: 'Firebase', file: 'firebase-color.svg', color: '#DD2C00' },
    { name: 'Jira', file: 'jira-color.svg', color: '#0052CC' },
    { name: 'WordPress', file: 'wordpress.svg', color: '#21759B' },
    { name: 'Bootstrap', file: 'bootstrap.svg', color: '#7952B3' },
    { name: 'Squarespace', file: 'squarespace.svg', color: '#000000' },
    { name: 'Canva', file: 'canva.svg', color: '#00C4CC' },
    { name: 'Procreate', file: 'procreate.png', color: '#CF4BE1' },
    { name: 'Procreate Dreams', file: 'procreate-dreams.png', color: '#FB9059' },
    { name: 'Java', file: 'java.svg', color: '#000000' },
    { name: 'JavaScript', file: 'javascript.svg', color: '#F7DF1E' },
    { name: 'HTML', file: 'html.svg', color: '#E34F26' },
    { name: 'CSS', file: 'css.svg', color: '#1572B6' },
    { name: 'SQL', file: 'sql.svg', color: '#4A90D9' },
    { name: 'R', file: 'r-color.svg', color: '#276DC3' }
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

  /* Every row must end up the same total width, since all three rows share
     one scrollLeft — if SKILLS.length doesn't divide evenly by rowCount,
     pad the shorter rows by repeating their own items so measure()/wrapScroll()
     (which assume uniform row width) don't desync and show a blank gap. */
  var maxRowLen = Math.max.apply(null, rows.map(function (r) { return r.length; }));
  rows.forEach(function (row) {
    var originalLen = row.length;
    var i = 0;
    while (row.length < maxRowLen) {
      row.push(row[i % originalLen]);
      i++;
    }
  });

  /* Padding can put the same skill at both the start and end of a row, which
     then sits next to itself every time the row repeats (DUPES) back-to-back —
     that read as the same icon showing up twice in a row. Break any adjacent
     match (including the wrap-around seam) by swapping it with a far item. */
  rows.forEach(function (row) {
    for (var guard = 0; guard < 20; guard++) {
      var dupIndex = -1;
      for (var k = 0; k < row.length; k++) {
        if (row[k].name === row[(k + 1) % row.length].name) {
          dupIndex = k;
          break;
        }
      }
      if (dupIndex === -1) break;
      var swapWith = (dupIndex + Math.floor(row.length / 2)) % row.length;
      var tmp = row[dupIndex];
      row[dupIndex] = row[swapWith];
      row[swapWith] = tmp;
    }
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
        img.src = 'assets/icons/' + skill.file;
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
