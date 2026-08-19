(function () {
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- 通用：滚动进度 ---------- */
  var progress = $('.page-progress i');
  if (progress) {
    window.addEventListener('scroll', function () {
      var max = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = (max ? Math.round(scrollY / max * 100) : 0) + '%';
    }, { passive: true });
  }

  /* ---------- 通用：光标光晕 ---------- */
  var glow = $('.cursor-glow');
  if (glow) {
    window.addEventListener('pointermove', function (e) {
      glow.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    });
  }

  /* ---------- 通用：磁性按钮 ---------- */
  $$('.magnetic').forEach(function (btn) {
    btn.addEventListener('pointermove', function (e) {
      var box = btn.getBoundingClientRect();
      btn.style.transform = 'translate(' + ((e.clientX - box.left - box.width / 2) * 0.08) + 'px,' + ((e.clientY - box.top - box.height / 2) * 0.08) + 'px)';
    });
    btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
  });

  /* ---------- 通用：禁止右键另存为 / 拖拽保存 ---------- */
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });

  /* ---------- 第二页：极简媒体画廊 ---------- */
  var grid = $('#works-grid');
  if (!grid) return;

  var PAGE_SIZE = 10;
  var overrides = JSON.parse(localStorage.getItem('portfolioOverrides') || '{}');
  var items = Object.keys(window.PORTFOLIO_DATA || {}).map(function (id) {
    var item = window.PORTFOLIO_DATA[id];
    var o = overrides[id] || {};
    return {
      id: id,
      title: o.title || item.title,
      category: item.category,
      year: item.year,
      type: item.type,
      card: o.card || item.card,
      image: o.image || item.image,
      video: item.video || '',
      note: item.note || ''
    };
  });

  var filters = $$('#works-filters .filter');
  var loadMoreBtn = $('#load-more');
  var totalEl = $('#works-total');
  var pageCountEl = $('#page-count');

  var category = '全部';
  var visible = PAGE_SIZE;

  var pad = function (n) { return String(n).padStart(2, '0'); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var currentItems = function () {
    return items.filter(function (i) { return category === '全部' || i.category === category; });
  };

  if (totalEl) totalEl.textContent = pad(items.length);
  if (pageCountEl) pageCountEl.textContent = '01 / ' + pad(items.length);

  function buildCard(item, index) {
    var article = document.createElement('article');
    article.className = 'work-card';
    article.dataset.category = item.category;
    article.dataset.type = item.type;

    var media = item.type === 'video'
      ? '<video class="work-media" muted playsinline preload="metadata" src="' + esc(item.video) + '"></video><span class="play-badge">▶</span>'
      : '<img class="work-media" src="' + esc(item.image) + '" alt="' + esc(item.title) + '">';

    article.innerHTML =
      '<button class="work-trigger" data-index="' + index + '" aria-label="查看 ' + esc(item.title) + '">' +
        '<div class="work-image">' + media +
          '<span class="image-index">' + pad(index + 1) + '</span>' +
          '<span class="view-mark">' + (item.type === 'video' ? '播放视频' : '放大查看') + ' +</span>' +
        '</div>' +
        '<div class="work-info"><div>' +
          '<small>' + esc(item.category) + ' · ' + esc(item.year) + '</small>' +
          '<h2>' + esc(item.title) + '</h2>' +
          (item.card ? '<p>' + esc(item.card) + '</p>' : '') +
        '</div><time>' + esc(item.year) + '</time></div>' +
      '</button>';

    article.querySelector('.work-trigger').addEventListener('click', function () { openLightbox(index); });
    return article;
  }

  var reveal = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            reveal.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 })
    : null;

  function observeCards(container) {
    $$('.work-card', container).forEach(function (card) {
      if (reveal) reveal.observe(card);
      else card.classList.add('revealed');
    });
  }

  function render() {
    var list = currentItems();
    var slice = list.slice(0, visible);
    grid.innerHTML = '';
    slice.forEach(function (item, i) { grid.appendChild(buildCard(item, i)); });
    observeCards(grid);
    if (loadMoreBtn) loadMoreBtn.parentElement.hidden = visible >= list.length;
  }

  filters.forEach(function (filter) {
    filter.addEventListener('click', function () {
      filters.forEach(function (f) { f.classList.remove('active'); });
      filter.classList.add('active');
      category = filter.dataset.filter;
      visible = PAGE_SIZE;
      render();
    });
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      visible += PAGE_SIZE;
      render();
    });
  }

  /* ---------- 灯箱 ---------- */
  var lightbox = $('#lightbox');
  var lbImage = $('#lightbox-image');
  var lbVideo = $('#lightbox-video');
  var lbKicker = $('#lightbox-kicker');
  var lbTitle = $('#lightbox-title');
  var lbNote = $('#lightbox-note');
  var lbCount = $('#lightbox-count');

  var lightboxList = [];
  var currentIndex = 0;

  function openLightbox(index) {
    lightboxList = currentItems();
    currentIndex = index;
    updateLightbox();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function updateLightbox() {
    var item = lightboxList[currentIndex];
    if (!item) return;
    var isVideo = item.type === 'video';
    lbImage.hidden = isVideo;
    lbVideo.hidden = !isVideo;
    if (isVideo) {
      lbVideo.src = item.video;
      lbVideo.load();
      var p = lbVideo.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      lbVideo.pause();
      lbVideo.removeAttribute('src');
      lbImage.src = item.image;
      lbImage.alt = item.title;
    }
    lbKicker.textContent = item.category + ' · ' + item.year;
    lbTitle.textContent = item.title;
    lbNote.textContent = item.note || '';
    lbNote.hidden = !item.note;
    lbCount.textContent = pad(currentIndex + 1) + ' / ' + pad(lightboxList.length);
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    lbVideo.pause();
    lbVideo.removeAttribute('src');
  }

  function step(dir) {
    if (!lightboxList.length) return;
    currentIndex = (currentIndex + dir + lightboxList.length) % lightboxList.length;
    updateLightbox();
  }

  $('#lightbox-close').addEventListener('click', closeLightbox);
  $('#lightbox-prev').addEventListener('click', function () { step(-1); });
  $('#lightbox-next').addEventListener('click', function () { step(1); });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox || e.target.classList.contains('lightbox-stage') || e.target.classList.contains('lightbox-media')) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  render();
})();