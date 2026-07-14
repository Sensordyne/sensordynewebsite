(function () {
  'use strict';

  // Sticky nav border/shadow on scroll
  var nav = document.querySelector('.nav');
  if (nav) {
    var setScrolled = function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 4);
    };
    setScrolled();
    window.addEventListener('scroll', setScrolled, { passive: true });
  }

  // Mobile nav toggle
  var toggle = document.querySelector('.nav__toggle');
  var mobile = document.querySelector('.nav__mobile');
  if (toggle && mobile) {
    toggle.addEventListener('click', function () {
      var isOpen = mobile.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    mobile.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobile.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Stagger index for grouped reveals
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    var children = group.querySelectorAll(':scope > .fade-up');
    children.forEach(function (el, i) { el.style.setProperty('--i', i); });
  });

  // Fade-up reveal on scroll
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('.fade-up');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  }

  // Count-up animation for metric values
  var countEls = document.querySelectorAll('[data-count-to]');
  if (countEls.length) {
    var animateCount = function (el) {
      var to = parseFloat(el.getAttribute('data-count-to'));
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      var decimals = el.getAttribute('data-decimals') ? parseInt(el.getAttribute('data-decimals'), 10) : 0;
      var duration = 900;
      var start = null;

      var step = function (ts) {
        if (start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = to * eased;
        el.textContent = prefix + value.toFixed(decimals) + suffix;
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          el.textContent = prefix + to.toFixed(decimals) + suffix;
        }
      };
      window.requestAnimationFrame(step);
    };

    if (reduceMotion || !('IntersectionObserver' in window)) {
      countEls.forEach(function (el) {
        var to = parseFloat(el.getAttribute('data-count-to'));
        var prefix = el.getAttribute('data-prefix') || '';
        var suffix = el.getAttribute('data-suffix') || '';
        var decimals = el.getAttribute('data-decimals') ? parseInt(el.getAttribute('data-decimals'), 10) : 0;
        el.textContent = prefix + to.toFixed(decimals) + suffix;
      });
    } else {
      var countObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              countObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      countEls.forEach(function (el) { countObserver.observe(el); });
    }
  }
})();
