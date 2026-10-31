/* ==========================================================================
   Tools by Vizznity — shared enhancements (accessibility + failure handling)

   IMPORTANT: this file contains NO spreadsheet, calculation or export logic.
   It never reads or changes any data variable of a tool. It only
     1. tells the user clearly when the SheetJS library failed to load,
     2. shows messages that the tools raise via alert() in an accessible,
        non-blocking notice (control flow of the tools is unchanged:
        alert() returned undefined before and still does),
     3. adds missing labels / roles / keyboard support to existing markup,
     4. announces results to screen-reader users,
     5. lets keyboard users operate the Combine tool's drop zone.
   If this file fails to load, every tool still works exactly as before.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var uid = 0;
  var nativeAlert = window.alert;

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function clean(t) { return String(t || '').replace(/[^\w\s&()\-–/.,%+]/g, ' ').replace(/^\s*\d+\s+/, '').replace(/\s+/g, ' ').trim(); }

  /* ---------- live region for screen readers ---------- */
  var live;
  function ensureLive() {
    if (live) return live;
    live = doc.createElement('div');
    live.id = 'vz-live';
    live.className = 'vz-sr';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    doc.body.appendChild(live);
    return live;
  }
  function say(msg) {
    var el = ensureLive();
    el.textContent = '';
    window.setTimeout(function () { el.textContent = msg; }, 60);
  }

  /* ---------- accessible replacement for alert() ---------- */
  var toast;
  function closeToast() { if (toast && toast.parentNode) toast.parentNode.removeChild(toast); toast = null; }
  function showToast(message) {
    closeToast();
    toast = doc.createElement('div');
    toast.className = 'vz-toast';
    toast.setAttribute('role', 'alert');
    var msg = doc.createElement('div');
    msg.className = 'vz-toast__msg';
    msg.textContent = message;
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'vz-toast__close';
    btn.setAttribute('aria-label', 'Dismiss message');
    btn.textContent = '\u00D7';
    btn.addEventListener('click', closeToast);
    toast.appendChild(msg);
    toast.appendChild(btn);
    doc.body.appendChild(toast);
  }
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && toast) closeToast(); });

  function libraryMissing() { return typeof window.XLSX === 'undefined'; }

  var LIB_TEXT = 'The spreadsheet engine (SheetJS) did not load, so this tool cannot read or create Excel files right now. ' +
    'It is fetched from cdnjs.cloudflare.com each time the page opens. Check your internet connection, or ask your IT team ' +
    'to allow that address, then reload this page.';

  window.alert = function (message) {
    try {
      var text = String(message == null ? '' : message);
      if (/XLSX is not defined/i.test(text) || (libraryMissing() && /Could not read/i.test(text))) {
        showToast(LIB_TEXT);
      } else {
        showToast(text);
      }
    } catch (err) {
      nativeAlert.call(window, message);   // fall back to the browser's own dialog
    }
  };

  function showLibraryBanner() {
    var b = doc.createElement('div');
    b.className = 'vz-banner';
    b.setAttribute('role', 'alert');
    var p = doc.createElement('div');
    var s = doc.createElement('strong');
    s.textContent = 'Spreadsheet engine not loaded. ';
    p.appendChild(s);
    p.appendChild(doc.createTextNode(LIB_TEXT));
    var r = doc.createElement('button');
    r.type = 'button';
    r.textContent = 'Reload page';
    r.addEventListener('click', function () { window.location.reload(); });
    b.appendChild(p);
    b.appendChild(r);
    var skip = $('.vz-skip');
    if (skip && skip.nextSibling) skip.parentNode.insertBefore(b, skip.nextSibling);
    else doc.body.insertBefore(b, doc.body.firstChild);
    $$('input[type=file]').forEach(function (i) { i.disabled = true; i.setAttribute('aria-disabled', 'true'); });
  }

  /* ---------- accessibility enhancements for existing markup ---------- */
  function controlFor(label) {
    var c = label.nextElementSibling, hops = 0;
    while (c && hops < 3) {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName) && !/^(radio|checkbox|hidden)$/.test(c.type)) return c;
      var inner = c.querySelector && c.querySelector('select,textarea,input:not([type=radio]):not([type=checkbox]):not([type=hidden])');
      if (inner) return inner;
      c = c.nextElementSibling; hops++;
    }
    return null;
  }

  function cardTitle(el) {
    var card = el.closest('.card');
    var t = card && card.querySelector('.card-title');
    return t ? clean(t.textContent) : '';
  }

  function enhance(root) {
    root = root || doc;

    /* labels without a programmatic link to their field */
    $$('label:not([for])', root).forEach(function (label) {
      if (label.querySelector('input,select,textarea')) return;
      var next = label.nextElementSibling;
      if (next && next.classList && next.classList.contains('radio-group')) {   // caption for a radio group
        if (!label.id) label.id = 'vz-l-' + (++uid);
        next.setAttribute('role', 'radiogroup');
        next.setAttribute('aria-labelledby', label.id);
        return;
      }
      var ctl = controlFor(label);
      if (!ctl) return;
      if (ctl.labels && ctl.labels.length) return;
      if (!ctl.id) ctl.id = 'vz-f-' + (++uid);
      label.setAttribute('for', ctl.id);
    });

    /* radio groups without a name */
    $$('.radio-group:not([role])', root).forEach(function (g) {
      g.setAttribute('role', 'radiogroup');
      var name = cardTitle(g);
      if (name) g.setAttribute('aria-label', name);
    });

    /* file inputs need a name */
    $$('input[type=file]:not([aria-label])', root).forEach(function (i) {
      if (i.labels && i.labels.length) return;
      i.setAttribute('aria-label', i.hasAttribute('webkitdirectory') ? 'Choose a folder of Excel files' : 'Choose an Excel or CSV file');
    });

    /* data tables */
    $$('th:not([scope])', root).forEach(function (th) { th.setAttribute('scope', 'col'); });
    $$('.table-wrap:not([role])', root).forEach(function (w) {
      w.setAttribute('role', 'region');
      w.setAttribute('tabindex', '0');
      var name = cardTitle(w);
      w.setAttribute('aria-label', (name ? name + ' — ' : '') + 'table, scrollable');
    });

    /* key-column selects created by the Excel Sheet Merger */
    $$('select[id^="key1_"]:not([aria-label])', root).forEach(function (x) { x.setAttribute('aria-label', 'Sheet 1 column for matching pair ' + (parseInt(x.id.slice(5), 10) + 1)); });
    $$('select[id^="key2_"]:not([aria-label])', root).forEach(function (x) { x.setAttribute('aria-label', 'Sheet 2 column for matching pair ' + (parseInt(x.id.slice(5), 10) + 1)); });

    /* icon-only buttons */
    $$('.rule-del:not([aria-label])', root).forEach(function (b) { b.setAttribute('aria-label', 'Remove this summary rule'); });
    $$('.rate-del:not([aria-label])', root).forEach(function (b) { b.setAttribute('aria-label', 'Remove this rate row'); });
    $$('.matrix-row-del:not([aria-label])', root).forEach(function (b) { b.setAttribute('aria-label', 'Remove this approval row'); });

    /* click-only controls -> keyboard operable */
    $$('.sheet-tab:not([role])', root).forEach(function (t) {
      t.setAttribute('role', 'button');
      t.setAttribute('tabindex', '0');
      t.setAttribute('aria-pressed', t.classList.contains('active') ? 'true' : 'false');
    });
    $$('tr.case-row:not([role])', root).forEach(function (r) {
      r.setAttribute('role', 'button');
      r.setAttribute('tabindex', '0');
      r.setAttribute('aria-expanded', 'false');
      r.setAttribute('aria-label', 'Case ' + clean((r.cells[0] || {}).textContent) + ' — press Enter to show or hide the purchase orders in this case');
    });

    /* decorative emoji */
    $$('.upload-icon,.logo,.empty .icon,.dropzone .icon,.tool-icon', root).forEach(function (e) { e.setAttribute('aria-hidden', 'true'); });
  }

  function syncPressed() {
    $$('.sheet-tab[role=button]').forEach(function (t) { t.setAttribute('aria-pressed', t.classList.contains('active') ? 'true' : 'false'); });
    $$('tr.case-row[role=button]').forEach(function (r) {
      var d = r.nextElementSibling;
      r.setAttribute('aria-expanded', d && d.classList.contains('detail-row') && !d.classList.contains('hidden') ? 'true' : 'false');
    });
  }

  var refocusText = null;
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = e.target;
    if (!t || !t.matches) return;
    if (t.matches('.sheet-tab[role=button], tr.case-row[role=button]')) {
      e.preventDefault();
      if (t.classList.contains('sheet-tab')) refocusText = t.textContent;
      t.click();
    }
  });
  doc.addEventListener('click', function () {
    window.setTimeout(function () {
      syncPressed();
      if (refocusText !== null) {
        var wanted = refocusText;
        refocusText = null;
        window.setTimeout(function () {
          var match = $$('.sheet-tab').filter(function (x) { return x.textContent === wanted; })[0];
          if (match) { enhance(doc); match.focus(); syncPressed(); }
        }, 80);
      }
    }, 0);
  });

  /* ---------- announce results and file loading to screen readers ---------- */
  function watchText(el, build) {
    if (!el || !window.MutationObserver) return;
    var timer;
    new MutationObserver(function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        var m = build(el);
        if (m) say(m);
      }, 200);
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }
  function wireAnnouncements() {
    watchText($('#fileName'), function (el) { return el.textContent.trim() ? 'File loaded: ' + el.textContent.trim() : ''; });
    ['resultAlert', 'mergeAlert', 'casesAlert'].forEach(function (id) {
      watchText(doc.getElementById(id), function (el) { return el.textContent.replace(/\s+/g, ' ').trim(); });
    });
  }

  /* ---------- Combine tool: keyboard + secondary file picker ---------- */
  function wireCombine() {
    var dz = doc.getElementById('dropzone');
    var folder = doc.getElementById('folderInput');
    var files = doc.getElementById('filesInput');
    if (!dz || !folder || !files) return;

    dz.setAttribute('role', 'button');
    dz.setAttribute('tabindex', '0');
    dz.setAttribute('aria-label', 'Choose a folder of Excel files, or drop Excel files here');
    dz.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dz.click(); }
    });

    var alt = doc.createElement('button');
    alt.type = 'button';
    alt.className = 'btn-ghost vz-choose-files';
    alt.style.marginTop = '12px';
    alt.textContent = 'Choose individual files instead of a folder';
    alt.addEventListener('click', function () { files.click(); });
    dz.parentNode.insertBefore(alt, dz.nextSibling);

    var outer = doc.getElementById('progressOuter');
    var inner = doc.getElementById('progressInner');
    if (outer && inner) {
      outer.setAttribute('role', 'progressbar');
      outer.setAttribute('aria-label', 'Combining files');
      outer.setAttribute('aria-valuemin', '0');
      outer.setAttribute('aria-valuemax', '100');
      outer.setAttribute('aria-valuenow', '0');
      new MutationObserver(function () {
        outer.setAttribute('aria-valuenow', String(parseInt(inner.style.width, 10) || 0));
      }).observe(inner, { attributes: true, attributeFilter: ['style'] });
    }

    var summary = doc.getElementById('summary');
    if (summary && window.MutationObserver) {
      new MutationObserver(function () {
        if (summary.classList.contains('show')) {
          var ok = (doc.getElementById('stat-ok') || {}).textContent;
          var fail = (doc.getElementById('stat-fail') || {}).textContent;
          var total = (doc.getElementById('stat-total') || {}).textContent;
          say('Finished. ' + ok + ' of ' + total + ' files imported, ' + fail + ' skipped. Download buttons are now available.');
        }
      }).observe(summary, { attributes: true, attributeFilter: ['class'] });
    }
    var dzMain = doc.getElementById('dz-main');
    watchText(dzMain, function (el) { return el.textContent.trim(); });
    var err = doc.getElementById('errorLog');
    if (err) err.setAttribute('role', 'status');
  }

  /* ---------- start ---------- */
  function init() {
    ensureLive();
    if (libraryMissing()) showLibraryBanner();
    enhance(doc);
    wireAnnouncements();
    wireCombine();
    if (window.MutationObserver) {
      var pending = false;
      new MutationObserver(function () {
        if (pending) return;
        pending = true;
        window.setTimeout(function () { pending = false; enhance(doc); syncPressed(); }, 50);
      }).observe(doc.body, { childList: true, subtree: true });
    }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
