/**
 * SensorDyme — global interactions.
 * Plain JS, no build step. Every feature null-checks its elements so the
 * same script runs on index.html, solutions.html, and product.html.
 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Official logo auto-swap ----------------
     Drop the official transparent logo at assets/logo-official.png and every
     mark on the site (nav, footer, loader, favicon) switches to it. */
  (function () {
    var probe = new Image();
    probe.onload = function () {
      document.querySelectorAll('img[src$="logo-mark.svg"]').forEach(function (img) {
        img.src = 'assets/logo-official.png';
      });
      var icon = document.querySelector('link[rel="icon"]');
      if (icon) icon.href = 'assets/logo-official.png';
    };
    probe.src = 'assets/logo-official.png';
  })();

  /* ---------------- I18N: full-site translation ----------------
     Dictionaries live in assets/i18n/<code>.json keyed by the normalized
     English source string. The walker stores each node's original English
     so switching languages (or back to English) is lossless. A
     MutationObserver translates dynamically rendered content (cart, search
     results, carousel updates) with the active dictionary. */
  var I18N_ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var i18nCache = {};
  var i18nDict = null; // null => English
  var i18nOrigText = new WeakMap();
  var i18nOrigAttrs = new WeakMap();
  var i18nApplying = false;

  function i18nKey(s) {
    return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  }

  function i18nText(node) {
    var raw = node.nodeValue;
    if (!raw || !i18nKey(raw)) return;
    var orig = i18nOrigText.get(node);
    if (orig === undefined) { orig = raw; i18nOrigText.set(node, orig); }
    var next = i18nDict ? (i18nDict[i18nKey(orig)] || orig) : orig;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function i18nElement(el) {
    if (el.nodeName === 'SCRIPT' || el.nodeName === 'STYLE') return;
    var origs = i18nOrigAttrs.get(el);
    I18N_ATTRS.forEach(function (attr) {
      if (!el.hasAttribute(attr)) return;
      if (!origs) { origs = {}; i18nOrigAttrs.set(el, origs); }
      if (origs[attr] === undefined) origs[attr] = el.getAttribute(attr);
      var next = i18nDict ? (i18nDict[i18nKey(origs[attr])] || origs[attr]) : origs[attr];
      if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
    });
  }

  function i18nWalk(root) {
    i18nApplying = true;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1 && (n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE' || n.id === 'heroTitle')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    if (root.nodeType === 1) i18nElement(root);
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === 3) i18nText(n);
      else i18nElement(n);
    }
    i18nApplying = false;
  }

  var heroTitleEl = document.getElementById('heroTitle');
  if (heroTitleEl && !heroTitleEl.dataset.orig) {
    heroTitleEl.dataset.orig = heroTitleEl.textContent;
  }

  function splitHeroWords(text) {
    if (!heroTitleEl) return;
    heroTitleEl.textContent = '';
    if (reduceMotion) { heroTitleEl.textContent = text; return; }
    text.split(/\s+/).filter(Boolean).forEach(function (word, i, arr) {
      var span = document.createElement('span');
      span.className = 'w';
      span.textContent = word;
      span.style.animationDelay = (0.15 + i * 0.12) + 's';
      heroTitleEl.appendChild(span);
      if (i < arr.length - 1) heroTitleEl.appendChild(document.createTextNode(' '));
    });
  }

  var docTitleOrig = document.title;

  function i18nApplyAll() {
    i18nWalk(document.body);
    document.title = i18nDict ? (i18nDict[i18nKey(docTitleOrig)] || docTitleOrig) : docTitleOrig;
    if (heroTitleEl) {
      var full = heroTitleEl.dataset.orig;
      splitHeroWords(i18nDict ? (i18nDict[i18nKey(full)] || full) : full);
    }
  }

  function applyLanguage(code) {
    document.documentElement.lang = code;
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    if (code === 'en') { i18nDict = null; i18nApplyAll(); return; }
    if (i18nCache[code]) { i18nDict = i18nCache[code]; i18nApplyAll(); return; }
    fetch('assets/i18n/' + code + '.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { i18nCache[code] = d; i18nDict = d; i18nApplyAll(); })
      .catch(function () { /* dictionary missing: stay in English */ });
  }

  if ('MutationObserver' in window) {
    new MutationObserver(function (muts) {
      if (i18nApplying || !i18nDict) return;
      muts.forEach(function (m) {
        m.addedNodes && m.addedNodes.forEach && m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1) i18nWalk(n);
          else if (n.nodeType === 3) { i18nApplying = true; i18nText(n); i18nApplying = false; }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------------- Loading screen ---------------- */
  var loader = document.getElementById('loader');
  if (loader) {
    var hideLoader = function () { loader.classList.add('is-done'); };
    if (reduceMotion) {
      hideLoader();
    } else {
      window.addEventListener('load', function () { setTimeout(hideLoader, 500); });
      // Safety: never trap the user behind the loader.
      setTimeout(hideLoader, 2200);
    }
  }

  /* ---------------- Navigation ---------------- */
  var nav = document.getElementById('nav');
  if (nav) {
    var lastY = window.scrollY;
    var onScroll = function () {
      var y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 8);
      // Hide on downward scroll, reappear on upward scroll.
      if (y > 320 && y > lastY + 4) {
        nav.classList.add('is-hidden');
      } else if (y < lastY - 4 || y < 320) {
        nav.classList.remove('is-hidden');
      }
      lastY = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var toggle = document.querySelector('.nav__toggle');
  var mobile = document.getElementById('navMobile');
  if (toggle && mobile) {
    toggle.addEventListener('click', function () {
      var open = mobile.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    mobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobile.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- Language selector ---------------- */
  var LANGS = [
    ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'],
    ['it', 'Italiano'], ['pt', 'Português'], ['nl', 'Nederlands'], ['ja', '日本語'],
    ['ko', '한국어'], ['zh-CN', '中文（简体）'], ['zh-TW', '中文（繁體）'],
    ['ar', 'العربية'], ['hi', 'हिन्दी']
  ];
  var langBtn = document.getElementById('langBtn');
  var langMenu = document.getElementById('langMenu');
  var langLabel = document.getElementById('langLabel');
  var footerLang = document.getElementById('footerLang');
  if (langBtn && langMenu) {
    var savedLang = 'en';
    try { savedLang = localStorage.getItem('sd_lang') || 'en'; } catch (e) {}

    var syncLangUI = function () {
      if (langLabel) langLabel.textContent = savedLang.split('-')[0].toUpperCase();
      if (footerLang) footerLang.value = savedLang;
    };

    if (footerLang) {
      LANGS.forEach(function (pair) {
        var opt = document.createElement('option');
        opt.value = pair[0];
        opt.textContent = pair[1];
        footerLang.appendChild(opt);
      });
      footerLang.addEventListener('change', function () {
        savedLang = footerLang.value;
        try { localStorage.setItem('sd_lang', savedLang); } catch (e) {}
        renderLangs();
        applyLanguage(savedLang);
      });
    }

    var renderLangs = function () {
      langMenu.innerHTML = '';
      LANGS.forEach(function (pair) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = pair[1];
        b.setAttribute('role', 'menuitem');
        if (pair[0] === savedLang) {
          b.classList.add('is-active');
          b.innerHTML = pair[1] + ' <span aria-hidden="true">✓</span>';
        }
        b.addEventListener('click', function () {
          savedLang = pair[0];
          try { localStorage.setItem('sd_lang', savedLang); } catch (e) {}
          renderLangs();
          applyLanguage(savedLang);
        });
        langMenu.appendChild(b);
      });
      var note = document.createElement('div');
      note.className = 'lang-menu__note';
      note.textContent = 'Your language applies across the entire site.';
      langMenu.appendChild(note);
      syncLangUI();
    };
    renderLangs();
    if (savedLang !== 'en') applyLanguage(savedLang);

    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = langMenu.classList.toggle('is-open');
      langBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (!langMenu.contains(e.target)) {
        langMenu.classList.remove('is-open');
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------- Search overlay ---------------- */
  var searchOverlay = document.getElementById('searchOverlay');
  var searchOpen = document.getElementById('searchOpen');
  var searchClose = document.getElementById('searchClose');
  var searchInput = document.getElementById('searchInput');
  var searchResults = document.getElementById('searchResults');

  var CAM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>';
  var SEARCH_INDEX = [
    { title: 'SensorDyme AI Camera', sub: 'The camera that detects and protects — $499', href: 'product.html',
      keys: 'camera ai security monitoring home baby elderly driving pet construction agriculture warehouse business school retail healthcare product buy price 4k detect protect shop' },
    { title: 'Solutions & Use Cases', sub: 'Homes, businesses, schools, farms, and more', href: 'solutions.html',
      keys: 'solutions use cases home business education school warehouse construction agriculture healthcare retail government pet baby elderly teen driving hospital parking manufacturing smart city' },
    { title: 'How It Works', sub: 'Captures → Analyzes → Understands → Alerts → Protects', href: 'index.html#how-it-works',
      keys: 'how it works ai platform detection technology intelligence events pipeline' },
    { title: 'Technology & Specs', sub: 'Custom AI rules, hardware design, specifications', href: 'product.html#technology',
      keys: 'technology specs specifications rules prompts hardware design lens processor' },
    { title: 'Shop — $499', sub: 'Add the SensorDyme AI Camera to your cart', href: 'index.html#shop',
      keys: 'pricing price cost buy purchase order shop cart 499' },
    { title: 'Support & FAQ', sub: 'Answers to common questions', href: 'product.html#faq',
      keys: 'support faq help questions warranty shipping returns subscription contact' },
    { title: 'About SensorDyme', sub: 'Our mission: protecting people through intelligent vision', href: 'about.html',
      keys: 'about company mission vision team contact careers' }
  ];

  function renderSearch(q) {
    if (!searchResults) return;
    q = (q || '').trim().toLowerCase();
    var matches = !q ? SEARCH_INDEX : SEARCH_INDEX.filter(function (item) {
      return (item.title + ' ' + item.sub + ' ' + item.keys).toLowerCase().indexOf(q) !== -1 ||
        q.split(/\s+/).every(function (w) { return (item.title + ' ' + item.keys).toLowerCase().indexOf(w) !== -1; });
    });
    var label = q ? 'Results' : 'Suggested';
    var html = '<div class="search-results__label">' + label + '</div>';
    if (!matches.length) {
      html += '<p class="search-empty">No results for “' + q.replace(/[<>&]/g, '') + '”. Try “camera”, “solutions”, or “pricing”.</p>';
    } else {
      matches.forEach(function (item) {
        html += '<a class="search-result" href="' + item.href + '">' +
          '<span class="search-result__icon">' + CAM_ICON + '</span>' +
          '<span><strong>' + item.title + '</strong><span>' + item.sub + '</span></span></a>';
      });
    }
    searchResults.innerHTML = html;
  }

  function openSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.add('is-open');
    renderSearch('');
    if (searchInput) { searchInput.value = ''; searchInput.focus(); }
  }
  function closeSearch() {
    if (searchOverlay) searchOverlay.classList.remove('is-open');
  }

  if (searchOpen) searchOpen.addEventListener('click', openSearch);
  var navSearchField = document.getElementById('navSearchField');
  if (navSearchField) navSearchField.addEventListener('click', openSearch);
  if (searchClose) searchClose.addEventListener('click', closeSearch);
  if (searchInput) searchInput.addEventListener('input', function () { renderSearch(searchInput.value); });

  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    var typing = tag === 'INPUT' || tag === 'TEXTAREA';
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault(); openSearch();
    } else if (e.key === '/' && !typing) {
      e.preventDefault(); openSearch();
    } else if (e.key === 'Escape') {
      closeSearch();
      closeCart();
    }
  });

  /* ---------------- Cart ---------------- */
  var PRODUCT = { name: 'SensorDyme AI Camera', price: 499 };
  var cartDrawer = document.getElementById('cartDrawer');
  var cartBackdrop = document.getElementById('cartBackdrop');
  var cartBody = document.getElementById('cartBody');
  var cartFoot = document.getElementById('cartFoot');
  var cartCount = document.getElementById('cartCount');

  function getQty() {
    try { return Math.max(0, parseInt(localStorage.getItem('sd_cart_qty') || '0', 10) || 0); }
    catch (e) { return 0; }
  }
  function setQty(q) {
    q = Math.max(0, Math.min(99, q));
    try { localStorage.setItem('sd_cart_qty', String(q)); } catch (e) {}
    renderCart();
  }

  function money(n) { return '$' + n.toFixed(2).replace(/\.00$/, ''); }

  function renderCart() {
    var qty = getQty();
    if (cartCount) {
      cartCount.textContent = String(qty);
      cartCount.classList.toggle('is-visible', qty > 0);
    }
    if (!cartBody || !cartFoot) return;

    if (qty === 0) {
      cartBody.innerHTML =
        '<div class="cart-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h14l-1.5 9.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.7L5.2 4.6A2 2 0 0 0 3.3 3H2"/><circle cx="9.5" cy="21" r="1"/><circle cx="16.5" cy="21" r="1"/></svg>' +
        'Your cart is empty.<br>Discover what SensorDyme can do.</div>';
      cartFoot.innerHTML = '<a class="btn btn--outline" href="product.html" style="width:100%">Continue Shopping</a>';
      return;
    }

    var subtotal = PRODUCT.price * qty;
    cartBody.innerHTML =
      '<div class="cart-item">' +
      '<div class="cart-item__img">' + CAM_ICON + '</div>' +
      '<div class="cart-item__info"><strong>' + PRODUCT.name + '</strong><span>' + money(PRODUCT.price) + '</span>' +
      '<div class="qty"><button type="button" id="qtyMinus" aria-label="Decrease quantity">−</button><span>' + qty + '</span><button type="button" id="qtyPlus" aria-label="Increase quantity">+</button></div>' +
      '</div></div>';
    cartFoot.innerHTML =
      '<div class="cart-line"><span>Subtotal</span><span>' + money(subtotal) + '</span></div>' +
      '<div class="cart-line"><span>Shipping</span><span>Calculated at confirmation</span></div>' +
      '<div class="cart-line"><span>Estimated tax</span><span>Calculated at confirmation</span></div>' +
      '<div class="cart-line cart-line--total"><span>Total</span><span>' + money(subtotal) + '</span></div>' +
      '<a class="btn btn--primary" id="checkoutBtn" href="mailto:hello@sensordyme.com?subject=' +
      encodeURIComponent('SensorDyme Order — ' + qty + '× AI Camera') +
      '&body=' + encodeURIComponent('Hi SensorDyme,\n\nI would like to order ' + qty + '× ' + PRODUCT.name + ' (' + money(subtotal) + ').\n\nShipping address:\n\nPreferred payment method:\n') +
      '">Checkout</a>' +
      '<a class="btn btn--outline" href="product.html" style="width:100%">Continue Shopping</a>' +
      '<p class="cart-note">Checkout is handled as a direct order inquiry while our online store is being finalized.</p>';

    var minus = document.getElementById('qtyMinus');
    var plus = document.getElementById('qtyPlus');
    if (minus) minus.addEventListener('click', function () { setQty(getQty() - 1); });
    if (plus) plus.addEventListener('click', function () { setQty(getQty() + 1); });
  }

  function openCart() {
    if (!cartDrawer) return;
    renderCart();
    cartDrawer.classList.add('is-open');
    if (cartBackdrop) cartBackdrop.classList.add('is-open');
  }
  function closeCart() {
    if (cartDrawer) cartDrawer.classList.remove('is-open');
    if (cartBackdrop) cartBackdrop.classList.remove('is-open');
  }

  var cartOpenBtn = document.getElementById('cartOpen');
  var cartCloseBtn = document.getElementById('cartClose');
  if (cartOpenBtn) cartOpenBtn.addEventListener('click', openCart);
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener('click', closeCart);

  document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      setQty(getQty() + 1);
      openCart();
    });
  });
  renderCart();

  /* ---------------- Company dropdown ---------------- */
  document.querySelectorAll('.dropdown').forEach(function (dd) {
    var btn = dd.querySelector(':scope > .nav__link');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dd.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) {
        dd.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  });

  /* ---------------- Product gallery thumbnails ---------------- */
  var viewBtns = document.querySelectorAll('[data-view]');
  if (viewBtns.length) {
    viewBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var view = btn.getAttribute('data-view');
        viewBtns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
        document.querySelectorAll('[data-view-panel]').forEach(function (panel) {
          panel.classList.toggle('is-active', panel.getAttribute('data-view-panel') === view);
        });
      });
    });
  }

  /* ---------------- Reveal animations ---------------- */
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    group.querySelectorAll(':scope .fade-up').forEach(function (el, i) {
      el.style.setProperty('--i', i);
    });
  });

  var revealEls = document.querySelectorAll('.fade-up, .pipeline__step');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* ---------------- Hero: word-by-word headline ---------------- */
  if (heroTitleEl) splitHeroWords(heroTitleEl.dataset.orig);

  /* ---------------- Hero carousels (supports multiple instances) ---------------- */
  var carousels = [];
  document.querySelectorAll('.ucc').forEach(function (root) {
    var track = root.querySelector('.ucc__track');
    if (!track) return;
    var slides = track.querySelectorAll('.ucc__slide');
    var dotsWrap = root.nextElementSibling;
    if (!dotsWrap || !dotsWrap.classList.contains('ucc__dots')) dotsWrap = null;
    var dots = dotsWrap ? dotsWrap.querySelectorAll('button') : [];
    var count = slides.length;
    var api = { root: root, current: 0 };

    api.set = function (i) {
      api.current = ((i % count) + count) % count; // wrap both directions
      track.style.transform = 'translateX(-' + api.current * 100 + '%)';
      dots.forEach(function (d, j) {
        d.classList.toggle('is-active', j === api.current);
        d.setAttribute('aria-selected', String(j === api.current));
      });
      slides.forEach(function (s, j) {
        var active = j === api.current;
        s.setAttribute('aria-hidden', String(!active));
        s.querySelectorAll('a, button').forEach(function (el) {
          el.tabIndex = active ? 0 : -1;
        });
      });
    };

    var prevBtn = root.querySelector('.ucc__arrow--prev');
    var nextBtn = root.querySelector('.ucc__arrow--next');
    if (prevBtn) prevBtn.addEventListener('click', function () { api.set(api.current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { api.set(api.current + 1); });
    dots.forEach(function (d, j) {
      d.addEventListener('click', function () { api.set(j); });
    });

    var touchX = null;
    track.addEventListener('touchstart', function (e) {
      touchX = e.touches[0].clientX;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 40) api.set(api.current + (dx < 0 ? 1 : -1));
    }, { passive: true });

    api.set(0);
    carousels.push(api);
  });

  if (carousels.length) {
    // Arrow keys drive whichever carousel is closest to the viewport center
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      var mid = window.innerHeight / 2;
      var best = null, bestDist = Infinity;
      carousels.forEach(function (c) {
        var r = c.root.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        var d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestDist) { bestDist = d; best = c; }
      });
      if (!best) return;
      e.preventDefault();
      best.set(best.current + (e.key === 'ArrowRight' ? 1 : -1));
    });
  }

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('button');
    var body = item.querySelector('.faq-item__body');
    if (!btn || !body) return;
    btn.addEventListener('click', function () {
      var open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      body.style.maxHeight = open ? body.scrollHeight + 'px' : '0px';
    });
  });

  /* ---------------- Prompt builder demo ---------------- */
  var promptForm = document.getElementById('promptForm');
  var promptInput = document.getElementById('promptInput');
  var promptResult = document.getElementById('promptResult');
  var promptResultTitle = document.getElementById('promptResultTitle');

  function titleCase(s) {
    return s.replace(/\w\S*/g, function (w) { return w.charAt(0).toUpperCase() + w.slice(1); });
  }
  function showPrompt(text) {
    if (!promptResult || !promptResultTitle) return;
    var clean = (text || '').trim();
    if (!clean) return;
    promptResult.classList.remove('is-live');
    setTimeout(function () {
      promptResultTitle.textContent = titleCase(clean);
      promptResult.classList.add('is-live');
    }, 250);
  }
  if (promptForm && promptInput) {
    promptForm.addEventListener('submit', function (e) {
      e.preventDefault();
      showPrompt(promptInput.value || promptInput.placeholder);
    });
  }
  var promptExamples = document.getElementById('promptExamples');
  if (promptExamples) {
    promptExamples.querySelectorAll('.prompt-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (promptInput) promptInput.value = chip.textContent;
        showPrompt(chip.textContent);
      });
    });
  }

})();
