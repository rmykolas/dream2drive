/* FREEM A20 INDIVIDUAL suit configurator – Dream2Drive */
(function () {
  'use strict';

  var VB = { front: [30, 60, 235, 460], left: [268, 60, 130, 460], back: [396, 60, 262, 460], right: [690, 60, 125, 460], both: [30, 60, 785, 460] };
  var SPOTS = [
    ['C1', 'Chest 1 (top left)', 'front', 124, 150, 24, 9, 0],
    ['C2', 'Chest 2 (top right)', 'front', 163, 150, 24, 9, 0],
    ['C3', 'Chest 3 (bottom left)', 'front', 124, 162, 24, 9, 0],
    ['C4', 'Chest 4 (bottom right)', 'front', 163, 162, 24, 9, 0],
    ['L1', 'Right sleeve 1 (top)', 'left', 329, 140, 18, 8, -10],
    ['L2', 'Right sleeve 2', 'left', 331, 152, 18, 8, -10],
    ['L3', 'Right sleeve 3', 'left', 333, 164, 18, 8, -10],
    ['R1', 'Left sleeve 1 (top)', 'right', 764, 140, 18, 8, 10],
    ['R2', 'Left sleeve 2', 'right', 762, 152, 18, 8, 10],
    ['R3', 'Left sleeve 3', 'right', 760, 164, 18, 8, 10],
    ['B1', 'Upper back', 'back', 543.5, 117, 46, 18, 0]
  ];
  var FLAGS = { 'None': null, 'Lithuania': ['h', '#fdb913', '#006a44', '#c1272d'], 'Latvia': ['h', '#9e3039', '#ffffff', '#9e3039'], 'Estonia': ['h', '#0072ce', '#000000', '#ffffff'], 'Poland': ['h2', '#ffffff', '#dc143c'], 'Germany': ['h', '#000000', '#dd0000', '#ffce00'], 'Italy': ['v', '#009246', '#ffffff', '#ce2b37'], 'France': ['v', '#0055a4', '#ffffff', '#ef4135'], 'Netherlands': ['h', '#ae1c28', '#ffffff', '#21468b'], 'Finland': ['x', '#ffffff', '#003580'], 'Sweden': ['x', '#006aa7', '#fecc00'], 'Denmark': ['x', '#c8102e', '#ffffff'], 'Ukraine': ['h2', '#0057b7', '#ffd700'] };
  var THUMB = { cols: 16, w: 80, h: 157 };

  function flagSvg(f, x, y, w, h) {
    if (!f) return '';
    var s = '<g transform="translate(' + x + ',' + y + ')">', i;
    if (f[0] === 'h') for (i = 0; i < 3; i++) s += '<rect y="' + (i * h / 3) + '" width="' + w + '" height="' + (h / 3 + 0.1) + '" fill="' + f[i + 1] + '"/>';
    else if (f[0] === 'h2') s += '<rect width="' + w + '" height="' + (h / 2) + '" fill="' + f[1] + '"/><rect y="' + (h / 2) + '" width="' + w + '" height="' + (h / 2) + '" fill="' + f[2] + '"/>';
    else if (f[0] === 'v') for (i = 0; i < 3; i++) s += '<rect x="' + (i * w / 3) + '" width="' + (w / 3 + 0.1) + '" height="' + h + '" fill="' + f[i + 1] + '"/>';
    else s += '<rect width="' + w + '" height="' + h + '" fill="' + f[1] + '"/><rect x="' + (w * 0.3) + '" width="' + (w * 0.15) + '" height="' + h + '" fill="' + f[2] + '"/><rect y="' + (h * 0.42) + '" width="' + w + '" height="' + (h * 0.18) + '" fill="' + f[2] + '"/>';
    return s + '<rect width="' + w + '" height="' + h + '" fill="none" stroke="rgba(0,0,0,.3)" stroke-width=".25"/></g>';
  }
  function rgb(h) { var n = parseInt(String(h).slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
  function lum(h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
  function dist(a, b) { var x = rgb(a), y = rgb(b); return Math.pow(x[0] - y[0], 2) + Math.pow(x[1] - y[1], 2) + Math.pow(x[2] - y[2], 2); }
  function parseList(txt) {
    return String(txt || '').split(/\r?\n/).map(function (l) {
      var p = l.split('|');
      return p.length > 1 ? [p[0].trim(), p[1].trim()] : null;
    }).filter(function (x) { return x && x[0] && /^#[0-9a-f]{6}$/i.test(x[1]); });
  }
  function names(txt) { return String(txt || '').split(/[\r\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fileUrl(base, code) { return base.split('?')[0].replace(/freem-a20-index\.json$/, 'freem-a20-' + code + '.json'); }

  function A20(root) {
    var self = this;
    this.root = root;
    this.cfg = JSON.parse(root.querySelector('[data-fc-config]').textContent);
    this.$ = function (sel) { return root.querySelector(sel); };
    var c = this.cfg;
    this.fabric = parseList(c.fabric);
    this.hex = {};
    this.fabric.forEach(function (f) { self.hex[f[0]] = f[1]; });
    this.all = this.fabric.map(function (f) { return f[0]; });
    this.stretchList = names(c.stretch).filter(function (n) { return self.hex[n]; });
    this.cuffList = names(c.cuff).filter(function (n) { return self.hex[n]; });
    this.st = { view: 'front', design: null, colours: {}, stretch: null, cuff: null, logos: {} };
    this.suits = {};
    this.form = this.$('form');
    var lp = c.logoPrefix || 'Logo';
    this.$('[data-fc-files]').innerHTML = SPOTS.map(function (s) {
      return '<input type="file" disabled data-k="' + s[0] + '" name="properties[' + esc(lp + ' – ' + s[1]) + ']" tabindex="-1">';
    }).join('') + '<input type="file" disabled data-fc-preview name="properties[_Mock-up]" tabindex="-1"><input type="file" disabled data-fc-svg name="properties[_Design file (SVG)]" tabindex="-1">';
    this.bind();
    this.syncVariant();
    fetch(c.index).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (idx) {
      self.index = idx;
      var want = (location.hash.match(/design=([\w-]+)/) || [])[1] || c.defaultDesign;
      var first = idx.filter(function (d) { return d.k === want; })[0] || idx[0];
      self.renderGallery();
      self.choose(first.k);
    }).catch(function () { self.fail(); });
  }

  A20.prototype.nearest = function (list, hex) {
    var self = this, best = list[0], bd = 1e9;
    if (!hex) return best;
    list.forEach(function (n) { var d = dist(self.hex[n], hex); if (d < bd) { bd = d; best = n; } });
    return best;
  };
  A20.prototype.meta = function () { var k = this.st.design; return (this.index || []).filter(function (d) { return d.k === k; })[0]; };

  A20.prototype.choose = function (code) {
    var self = this, m = (this.index || []).filter(function (d) { return d.k === code; })[0];
    if (!m) return;
    this.st.design = code;
    this.st.colours = {};
    m.z.forEach(function (z) { self.st.colours[z] = self.nearest(self.all, m.d[z]); });
    this.st.stretch = this.nearest(this.stretchList, m.s || '#1d1d1f');
    this.st.cuff = this.nearest(this.cuffList, m.c || '#14244a');
    this.renderControls();
    this.highlightThumb();
    if (this.suits[code]) return this.draw();
    var fig = this.$('[data-fc-fig]');
    fig.classList.add('is-loading');
    fetch(fileUrl(this.cfg.index, code)).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (raw) {
      self.suits[code] = raw;
      fig.classList.remove('is-loading');
      if (self.st.design === code) self.draw();
    }).catch(function () { self.fail(); });
  };
  A20.prototype.fail = function () {
    var fig = this.$('[data-fc-fig]');
    fig.classList.remove('is-loading');
    fig.innerHTML = '<p class="fc-fail">' + esc(this.cfg.failText) + '</p>';
  };

  A20.prototype.svgMarkup = function (view, forExport) {
    var S = this.suits[this.st.design]; if (!S) return '';
    var ox = S.off[0], oy = S.off[1], hex = this.hex, st = this.st, self = this;
    var css = Object.keys(st.colours).map(function (z) { return '.' + z + '{fill:' + hex[st.colours[z]] + '}'; }).join('') +
      '.zs{fill:' + hex[st.stretch] + '}.cuff{fill:' + hex[st.cuff] + '}';
    var body = view === 'both' ? S.front + S.left + S.back + S.right : S[view];
    var g = '<g transform="translate(' + ox + ',' + oy + ')">';
    SPOTS.forEach(function (sp, i) {
      if (view !== 'both' && sp[2] !== view) return;
      var k = sp[0], w = sp[5], h = sp[6], l = st.logos[k];
      var tr = 'translate(' + sp[3] + ',' + sp[4] + ') rotate(' + sp[7] + ')';
      if (l) g += '<g transform="' + tr + '"><image href="' + l.url + '" x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid meet"/></g>';
      else if (!forExport) g += '<g transform="' + tr + '"><rect class="fc-area" x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="1"/></g>';
      if (!forExport) g += '<g class="fc-spot' + (l ? ' has' : '') + '" tabindex="0" role="button" aria-label="' + esc(sp[1]) + '" data-k="' + k + '" transform="' + tr + '"><rect x="' + (-w / 2 - 2) + '" y="' + (-h / 2 - 2) + '" width="' + (w + 4) + '" height="' + (h + 4) + '" fill="transparent"/><circle r="3.6"/><text>' + (i + 1) + '</text></g>';
    });
    if (view === 'front' || view === 'both') {
      var nameEl = this.$('[data-fc-belt]'), flagEl = this.$('[data-fc-flag]');
      var nm = nameEl ? nameEl.value.trim().toUpperCase() : '', fl = flagEl ? FLAGS[flagEl.value] : null;
      var first = st.colours[Object.keys(st.colours)[0]];
      var ink = lum(hex[first] || '#ffffff') > 0.55 ? '#1d1d1f' : '#ffffff';
      var nx = fl ? 163 : 158;
      if (fl) g += flagSvg(fl, 134, 224.5, 7.5, 5);
      if (nm) g += '<text x="' + nx + '" y="227" font-family="Arial Narrow,Arial,sans-serif" font-weight="700" font-size="5.2" fill="' + ink + '" text-anchor="middle" dominant-baseline="central"' + (nm.length > 12 ? ' textLength="' + (fl ? 38 : 46) + '" lengthAdjust="spacingAndGlyphs"' : '') + '>' + esc(nm) + '</text>';
    }
    g += '</g>';
    var vb = VB[view];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (vb[0] + ox) + ' ' + (vb[1] + oy) + ' ' + vb[2] + ' ' + vb[3] + '"' +
      (forExport ? ' width="' + vb[2] * 3 + '" height="' + vb[3] * 3 + '"' : ' role="img" aria-label="' + esc(this.cfg.title + ' ' + st.design) + '"') +
      '><style>' + css + '</style>' + (forExport ? '<rect x="' + (vb[0] + ox) + '" y="' + (vb[1] + oy) + '" width="' + vb[2] + '" height="' + vb[3] + '" fill="#ececec"/>' : '') +
      body + g + '</svg>';
  };

  A20.prototype.draw = function () {
    if (!this.suits[this.st.design]) return;
    this.$('[data-fc-fig]').innerHTML = this.svgMarkup(this.st.view, false);
    this.renderList();
    this.sync();
  };

  A20.prototype.swatches = function (el, list, cur, cb) {
    var hex = this.hex;
    el.innerHTML = list.map(function (n) {
      return '<button type="button" class="fc-sw" style="background:' + hex[n] + '" title="' + esc(n) + '" aria-label="' + esc(n) + '" aria-pressed="' + (n === cur) + '" data-c="' + esc(n) + '"></button>';
    }).join('');
    el.onclick = function (e) { var b = e.target.closest('button'); if (b) cb(b.dataset.c); };
  };

  A20.prototype.renderControls = function () {
    var self = this, st = this.st, m = this.meta(), c = this.cfg;
    if (!m) return;
    this.$('[data-fc-design-name]').textContent = 'A20-' + st.design;
    this.thumbStyle(this.$('[data-fc-current-thumb]'), this.index.indexOf(m), 0.55);
    var cg = this.$('[data-fc-colours]');
    cg.innerHTML = m.z.map(function (z, i) {
      return '<div class="fc-group"><h3>' + esc(c.zoneLabel.replace('#', i + 1)) + ' <span>' + esc(st.colours[z]) + '</span></h3><div class="fc-sws" data-z="' + z + '"></div></div>';
    }).join('');
    cg.querySelectorAll('.fc-sws').forEach(function (el) {
      var z = el.dataset.z;
      self.swatches(el, self.all, st.colours[z], function (col) { st.colours[z] = col; self.renderControls(); self.draw(); });
    });
    this.swatches(this.$('[data-fc-stretch]'), this.stretchList, st.stretch, function (col) { st.stretch = col; self.renderControls(); self.draw(); });
    this.swatches(this.$('[data-fc-cuff]'), this.cuffList, st.cuff, function (col) { st.cuff = col; self.renderControls(); self.draw(); });
    this.$('[data-fc-stretch-name]').textContent = st.stretch;
    this.$('[data-fc-cuff-name]').textContent = st.cuff;
  };

  A20.prototype.thumbStyle = function (el, i, scale) {
    if (!el || i < 0) return;
    var s = scale || 1, col = i % THUMB.cols, row = Math.floor(i / THUMB.cols);
    el.style.backgroundImage = 'url("' + this.cfg.thumbs + '")';
    el.style.backgroundSize = (THUMB.cols * THUMB.w * s) + 'px auto';
    el.style.backgroundPosition = (-col * THUMB.w * s) + 'px ' + (-row * THUMB.h * s) + 'px';
    el.style.width = (THUMB.w * s) + 'px';
    el.style.height = (THUMB.h * s) + 'px';
  };

  A20.prototype.renderGallery = function () {
    var self = this, grid = this.$('[data-fc-grid]');
    grid.innerHTML = this.index.map(function (d) {
      return '<button type="button" class="fcg-item" data-k="' + esc(d.k) + '" aria-label="A20-' + esc(d.k) + '"><span class="fcg-thumb"></span><span class="fcg-code">' + esc(d.k) + '</span></button>';
    }).join('');
    grid.querySelectorAll('.fcg-thumb').forEach(function (el, i) { self.thumbStyle(el, i, 0.8); });
    this.$('[data-fc-gcount]').textContent = this.index.length;
  };
  A20.prototype.highlightThumb = function () {
    var k = this.st.design;
    this.root.querySelectorAll('.fcg-item').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.k === k); });
  };
  A20.prototype.filterGallery = function (q) {
    q = String(q || '').trim().toUpperCase();
    var n = 0;
    this.root.querySelectorAll('.fcg-item').forEach(function (b) {
      var show = !q || b.dataset.k.indexOf(q) > -1;
      b.hidden = !show; if (show) n++;
    });
    this.$('[data-fc-gcount]').textContent = n;
  };

  A20.prototype.renderList = function () {
    var st = this.st, cfg = this.cfg;
    this.$('[data-fc-logos]').innerHTML = SPOTS.map(function (sp, i) {
      var l = st.logos[sp[0]];
      return '<li class="' + (l ? 'has' : '') + '"><b>' + (i + 1) + '</b><span>' + esc(sp[1]) + (l ? '<small>' + esc(l.name) + '</small>' : '') + '</span>' +
        (l ? '<img src="' + l.url + '" alt="">' : '') +
        '<button type="button" class="fc-btn" data-k="' + sp[0] + '">' + esc(l ? cfg.changeText : cfg.addText) + '</button></li>';
    }).join('');
  };

  A20.prototype.syncVariant = function () {
    var c = this.cfg, v = c.variants.filter(function (x) { return x.id === c.selected; })[0] || c.variants[0];
    var btn = this.$('[data-fc-submit]');
    this.form.querySelector('input[name="id"]').value = v.id;
    btn.disabled = !v.available;
    btn.querySelector('span').textContent = v.available ? c.addToCart : c.soldOut;
  };

  A20.prototype.sync = function () {
    var st = this.st, c = this.cfg, f = this.form, m = this.meta();
    var props = {};
    props[c.designLabel] = 'A20-' + st.design;
    if (m) m.z.forEach(function (z, i) { props[c.zoneLabel.replace('#', i + 1)] = st.colours[z]; });
    props[c.stretchLabel] = st.stretch;
    props[c.cuffLabel] = st.cuff;
    this.$('[data-fc-props]').innerHTML = Object.keys(props).map(function (k) {
      return '<input type="hidden" name="properties[' + esc(k) + ']" value="' + esc(props[k]) + '">';
    }).join('');
    f.querySelectorAll('input[type=file][data-k]').forEach(function (inp) { inp.disabled = !st.logos[inp.dataset.k]; });
  };

  A20.prototype.openSpot = function (k) {
    var sp = SPOTS.filter(function (s) { return s[0] === k; })[0]; if (!sp) return;
    if (sp[2] !== this.st.view) this.setView(sp[2]);
    this.cur = k;
    var d = this.$('[data-fc-logo-dlg]');
    d.querySelector('[data-fc-dlg-title]').textContent = sp[1];
    d.querySelector('[data-fc-remove]').hidden = !this.st.logos[k];
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
  };
  // Logos must be vector files (print quality); raster images are refused with a message inside the logo dialog
  function vecErr(self) {
    var d = self.$('[data-fc-logo-dlg]') || self.$('dialog'), p = d.querySelector('[data-fc-vec-err]');
    if (!p) { p = document.createElement('p'); p.setAttribute('data-fc-vec-err', ''); p.setAttribute('role', 'alert'); p.style.cssText = 'color:#ff8a7a;font-weight:600;margin:10px 0 0'; var drop = d.querySelector('[data-fc-drop]'); drop.parentNode.insertBefore(p, drop.nextSibling); }
    p.textContent = /^lt/i.test(document.documentElement.lang) ? 'Įkelkite vektorinį logotipo failą: PDF, AI, EPS, SVG arba CDR. JPG ir PNG failai netinka spaudai.' : 'Please upload a vector logo file: PDF, AI, EPS, SVG or CDR. JPG and PNG files are not suitable for printing.';
    p.hidden = false;
  }

  A20.prototype.useFile = function (file) {
    var self = this, k = this.cur; if (!file || !k) return;
    var inp = this.form.querySelector('input[type=file][data-k="' + k + '"]');
    var ve = this.$('[data-fc-vec-err]'); if (ve) ve.hidden = true; if (!/\.(pdf|ai|eps|svg|cdr)$/i.test(file.name || '')) { try { if (inp) inp.value = ''; } catch (e2) {} vecErr(this); return; }
    if (file.size > 20 * 1024 * 1024) { var m = this.$('[data-fc-msg]'); m.textContent = this.cfg.tooBig; m.hidden = false; return; }
    try { var dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files; } catch (e) { /* picked straight into the input */ }
    var show = function (url) { self.st.logos[k] = { name: file.name, url: url }; self.$('[data-fc-logo-dlg]').close(); self.draw(); };
    if (/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type)) {
      var r = new FileReader(); r.onload = function () { show(r.result); }; r.readAsDataURL(file);
    } else {
      var ext = (file.name.split('.').pop() || 'file').toUpperCase().slice(0, 4);
      show('data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 24"><rect width="60" height="24" rx="2" fill="#d9dbe0"/><text x="30" y="16" font-family="Arial" font-weight="700" font-size="11" text-anchor="middle" fill="#262833">' + esc(ext) + '</text></svg>'));
    }
  };

  A20.prototype.setView = function (v) {
    this.st.view = v;
    this.root.querySelectorAll('[data-fc-view]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.fcView === v); });
    this.draw();
  };

  // Vector design file for the order: same SVG as the mock-up, with colours written as plain fills (CorelDRAW / Illustrator friendly)
  function vectorFile(svg, name) {
    var map = {}, m, re = /\.([\w-]+)\{fill:([^};]+)\}/g;
    while ((m = re.exec(svg))) map[m[1]] = m[2];
    try {
      var doc = new DOMParser().parseFromString(svg, 'image/svg+xml'), root = doc.documentElement;
      if (root.nodeName !== 'svg') throw new Error('bad svg');
      var own = root.querySelector('style'); if (own) own.parentNode.removeChild(own);
      Array.prototype.forEach.call(root.querySelectorAll('[class]'), function (el) {
        var cls = el.getAttribute('class').split(/\s+/), hit = cls.filter(function (c) { return map[c]; });
        if (hit.length) { el.setAttribute('fill', map[hit[hit.length - 1]]); el.removeAttribute('class'); }
      });
      root.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      Array.prototype.forEach.call(root.querySelectorAll('image'), function (im) { var h = im.getAttribute('href'); if (h) im.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', h); });
      svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(root);
    } catch (e) {}
    return new File([svg], name, { type: 'image/svg+xml' });
  }

  A20.prototype.preview = function () {
    var self = this;
    return new Promise(function (resolve) {
      try {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          c.getContext('2d').drawImage(img, 0, 0);
          c.toBlob(function (b) { resolve(b); }, 'image/png');
        };
        img.onerror = function () { resolve(null); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(self.svgMarkup('both', true));
      } catch (e) { resolve(null); }
      setTimeout(function () { resolve(null); }, 4000);
    });
  };

  A20.prototype.bind = function () {
    var self = this, root = this.root;
    var flagSel = this.$('[data-fc-flag]');
    if (flagSel) {
      flagSel.innerHTML = Object.keys(FLAGS).map(function (k) { return '<option value="' + k + '">' + k + '</option>'; }).join('');
      flagSel.addEventListener('change', function () { self.draw(); });
    }
    var beltIn = this.$('[data-fc-belt]');
    if (beltIn) beltIn.addEventListener('input', function () { self.draw(); });
    var gs = this.$('[data-fc-gsearch]');
    gs.addEventListener('input', function () { self.filterGallery(gs.value); });
    root.addEventListener('click', function (e) {
      var t = e.target;
      var v = t.closest('[data-fc-view]'); if (v) return self.setView(v.dataset.fcView);
      if (t.closest('[data-fc-open-gallery]')) { var gd = self.$('[data-fc-gallery]'); try { gd.showModal(); } catch (er) { gd.setAttribute('open', ''); } gs.focus(); return; }
      var gi = t.closest('.fcg-item');
      if (gi) { self.st.logos = self.st.logos; self.choose(gi.dataset.k); self.$('[data-fc-gallery]').close(); try { history.replaceState(null, '', '#design=' + gi.dataset.k); } catch (er) { /* ignore */ } return; }
      if (t.closest('[data-fc-gclose]')) return self.$('[data-fc-gallery]').close();
      var sp = t.closest('.fc-spot'); if (sp) return self.openSpot(sp.dataset.k);
      var lb = t.closest('[data-fc-logos] button'); if (lb) return self.openSpot(lb.dataset.k);
      if (t.closest('[data-fc-close]')) return self.$('[data-fc-logo-dlg]').close();
      if (t.closest('[data-fc-remove]')) {
        delete self.st.logos[self.cur];
        var inp = self.form.querySelector('input[type=file][data-k="' + self.cur + '"]'); if (inp) inp.value = '';
        self.$('[data-fc-logo-dlg]').close(); self.draw();
      }
      if (t.closest('[data-fc-choose]')) {
        var fi = self.form.querySelector('input[type=file][data-k="' + self.cur + '"]');
        fi.disabled = false; fi.click();
      }
      if (t.closest('[data-fc-inquiry]')) {
        var ci = document.querySelector('[data-ci-open]');
        if (ci) { ci.scrollIntoView({ behavior: 'smooth', block: 'center' }); ci.click(); }
      }
    });
    root.addEventListener('keydown', function (e) {
      var sp = e.target.closest && e.target.closest('.fc-spot');
      if (sp && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); self.openSpot(sp.dataset.k); }
    });
    this.form.querySelectorAll('input[type=file][data-k]').forEach(function (inp) {
      inp.addEventListener('change', function () { if (inp.files[0]) { self.cur = inp.dataset.k; self.useFile(inp.files[0]); } });
    });
    var drop = this.$('[data-fc-drop]');
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); self.useFile(e.dataTransfer.files[0]); });
    this.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = self.$('[data-fc-submit]'); if (btn.disabled || !self.st.design) return;
      var meas = self.$('[data-fc-meas]');
      if (self.cfg.measRequired && meas && !meas.files.length) {
        var m = self.$('[data-fc-msg]'); m.textContent = self.cfg.measMissing; m.hidden = false; meas.focus(); return;
      }
      if (meas && !meas.files.length) meas.disabled = true;
      btn.disabled = true; btn.classList.add('is-busy');
      self.sync();
      self.preview().then(function (blob) {
        var pv = self.form.querySelector('[data-fc-preview]');
        if (blob && pv) {
          try { var dt = new DataTransfer(); dt.items.add(new File([blob], 'suit-mockup-A20-' + self.st.design + '.png', { type: 'image/png' })); pv.files = dt.files; pv.disabled = false; } catch (err) { pv.disabled = true; }
        }
        try { var sv = self.form.querySelector('[data-fc-svg]'); var dt2 = new DataTransfer(); dt2.items.add(vectorFile(self.svgMarkup('both', true), 'suit-design-A20-' + self.st.design + '.svg')); sv.files = dt2.files; sv.disabled = false; } catch (err2) {}
        HTMLFormElement.prototype.submit.call(self.form);
      });
    });
  };

  function init() {
    document.querySelectorAll('[data-freem-a20]:not([data-ready])').forEach(function (el) {
      el.setAttribute('data-ready', '');
      try { new A20(el); } catch (e) { console.error('[FREEM A20 configurator]', e); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('shopify:section:load', init);
})();
