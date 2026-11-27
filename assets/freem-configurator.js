/* FREEM A20 START FIVE suit configurator – Dream2Drive */
(function () {
  'use strict';

  var VB = { front: [30, 60, 235, 460], left: [268, 60, 130, 460], back: [396, 60, 262, 460], right: [690, 60, 125, 460], both: [30, 60, 785, 460] };
  // Transfer-logo areas from the FREEM START FIVE "printed option" sheets: [key, label, view, cx, cy, w, h, rotate]
  var SPOTS_BASE = [
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
  var SPOT_BELT = ['BT', 'Belt', 'front', 158, 230, 28, 8, 0];
  var FLAGS = { 'None': null, 'Lithuania': ['h', '#fdb913', '#006a44', '#c1272d'], 'Latvia': ['h', '#9e3039', '#ffffff', '#9e3039'], 'Estonia': ['h', '#0072ce', '#000000', '#ffffff'], 'Poland': ['h2', '#ffffff', '#dc143c'], 'Germany': ['h', '#000000', '#dd0000', '#ffce00'], 'Italy': ['v', '#009246', '#ffffff', '#ce2b37'], 'France': ['v', '#0055a4', '#ffffff', '#ef4135'], 'Netherlands': ['h', '#ae1c28', '#ffffff', '#21468b'], 'Finland': ['x', '#ffffff', '#003580'], 'Sweden': ['x', '#006aa7', '#fecc00'], 'Denmark': ['x', '#c8102e', '#ffffff'], 'Ukraine': ['h2', '#0057b7', '#ffd700'] };
  function flagSvg(f, x, y, w, h) {
    if (!f) return '';
    var s = '<g transform="translate(' + x + ',' + y + ')">', i;
    if (f[0] === 'h') for (i = 0; i < 3; i++) s += '<rect y="' + (i * h / 3) + '" width="' + w + '" height="' + (h / 3 + 0.1) + '" fill="' + f[i + 1] + '"/>';
    else if (f[0] === 'h2') s += '<rect width="' + w + '" height="' + (h / 2) + '" fill="' + f[1] + '"/><rect y="' + (h / 2) + '" width="' + w + '" height="' + (h / 2) + '" fill="' + f[2] + '"/>';
    else if (f[0] === 'v') for (i = 0; i < 3; i++) s += '<rect x="' + (i * w / 3) + '" width="' + (w / 3 + 0.1) + '" height="' + h + '" fill="' + f[i + 1] + '"/>';
    else s += '<rect width="' + w + '" height="' + h + '" fill="' + f[1] + '"/><rect x="' + (w * 0.3) + '" width="' + (w * 0.15) + '" height="' + h + '" fill="' + f[2] + '"/><rect y="' + (h * 0.42) + '" width="' + w + '" height="' + (h * 0.18) + '" fill="' + f[2] + '"/>';
    return s + '<rect width="' + w + '" height="' + h + '" fill="none" stroke="rgba(0,0,0,.3)" stroke-width=".25"/></g>';
  }
  function lum(h) { var n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; }

  function parseList(txt) {
    return String(txt || '').split(/\r?\n/).map(function (l) {
      var p = l.split('|');
      return p.length > 1 ? [p[0].trim(), p[1].trim()] : null;
    }).filter(function (x) { return x && x[0] && /^#[0-9a-f]{6}$/i.test(x[1]); });
  }
  function names(txt) { return String(txt || '').split(/[\r\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function Configurator(root) {
    var self = this;
    this.root = root;
    this.cfg = JSON.parse(root.querySelector('[data-fc-config]').textContent);
    this.$ = function (sel) { return root.querySelector(sel); };
    var c = this.cfg;
    this.fabric = parseList(c.fabric);
    this.hex = {};
    this.fabric.forEach(function (f) { self.hex[f[0]] = f[1]; });
    this.stretchList = names(c.stretch).filter(function (n) { return self.hex[n]; });
    this.cuffList = names(c.cuff).filter(function (n) { return self.hex[n]; });
    this.beltDesigns = names(c.beltDesigns).map(function (s) { return s.toUpperCase(); });
    this.zones = [c.zone1, c.zone2, c.zone3];

    var on = c.optionNames.map(function (n) { return String(n).toLowerCase(); });
    this.di = on.indexOf('design');
    this.si = on.indexOf('size');
    this.designs = [];
    c.variants.forEach(function (v) {
      var d = self.di > -1 ? v.options[self.di] : 'TRIS';
      if (self.designs.indexOf(d) < 0) self.designs.push(d);
    });

    var first = c.variants.filter(function (v) { return v.id === c.selected; })[0] || c.variants[0];
    this.st = {
      view: 'front',
      design: this.di > -1 ? first.options[this.di] : this.designs[0],
      size: this.si > -1 ? first.options[this.si] : null,
      colours: this.defaults(),
      stretch: this.pick(this.stretchList, c.defStretch),
      cuff: this.pick(this.cuffList, c.defCuff),
      logos: {}
    };
    this.suits = {};
    this.form = this.$('form');
    var files = this.$('[data-fc-files]'), lp = c.logoPrefix || 'Logo';
    files.innerHTML = SPOTS_BASE.concat([SPOT_BELT]).map(function (s) {
      return '<input type="file" disabled data-k="' + s[0] + '" name="properties[' + esc(lp + ' – ' + s[1]) + ']" tabindex="-1">';
    }).join('') + '<input type="file" disabled data-fc-preview name="properties[_Mock-up]" tabindex="-1"><input type="file" disabled data-fc-svg name="properties[_Design file (SVG)]" tabindex="-1">';
    this.bind();
    this.renderControls();
    this.load(this.st.design);
  }

  Configurator.prototype.pick = function (list, want) { return list.indexOf(want) > -1 ? want : list[0]; };
  Configurator.prototype.defaults = function () {
    var self = this, all = this.fabric.map(function (f) { return f[0]; });
    return [this.cfg.def1, this.cfg.def2, this.cfg.def3].map(function (n, i) { return self.pick(all, n) || all[i]; });
  };
  Configurator.prototype.spots = function () {
    var s = SPOTS_BASE.slice();
    if (this.beltDesigns.indexOf(String(this.st.design).toUpperCase()) > -1) s.push(SPOT_BELT);
    return s;
  };

  Configurator.prototype.load = function (design) {
    var self = this, url = this.cfg.assets[String(design).toUpperCase()];
    if (this.suits[design]) { this.draw(); return; }
    if (!url) return this.fail();
    this.$('[data-fc-fig]').classList.add('is-loading');
    fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (raw) {
      self.suits[design] = raw;
      self.$('[data-fc-fig]').classList.remove('is-loading');
      if (self.st.design === design) self.draw();
    }).catch(function () { self.fail(); });
  };
  Configurator.prototype.fail = function () {
    this.$('[data-fc-fig]').classList.remove('is-loading');
    this.$('[data-fc-fig]').innerHTML = '<p class="fc-fail">' + esc(this.cfg.failText) + '</p>';
  };

  Configurator.prototype.svgMarkup = function (view, forExport) {
    var S = this.suits[this.st.design]; if (!S) return '';
    var ox = S.off[0], oy = S.off[1], hex = this.hex, st = this.st;
    var css = '.z1{fill:' + hex[st.colours[0]] + '}.z2{fill:' + hex[st.colours[1]] + '}.z3{fill:' + hex[st.colours[2]] +
      '}.zs{fill:' + hex[st.stretch] + '}.cuff{fill:' + hex[st.cuff] + '}';
    var body = view === 'both' ? S.front + (S.left || '') + S.back + (S.right || '') : (S[view] || '');
    var g = '<g transform="translate(' + ox + ',' + oy + ')">';
    var self = this;
    this.spots().forEach(function (sp, i) {
      if (view !== 'both' && sp[2] !== view) return;
      var k = sp[0], x = sp[3], y = sp[4], w = sp[5], h = sp[6], r = sp[7], l = st.logos[k];
      var tr = 'translate(' + x + ',' + y + ') rotate(' + r + ')';
      if (l) {
        g += '<g transform="' + tr + '"><image href="' + l.url + '" x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid meet"/></g>';
      } else if (!forExport) {
        g += '<g transform="' + tr + '"><rect class="fc-area" x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="1"/></g>';
      }
      if (!forExport) {
        g += '<g class="fc-spot' + (l ? ' has' : '') + '" tabindex="0" role="button" aria-label="' + esc(sp[1]) + '" data-k="' + k + '" transform="' + tr + '">' +
          '<rect x="' + (-w / 2 - 2) + '" y="' + (-h / 2 - 2) + '" width="' + (w + 4) + '" height="' + (h + 4) + '" fill="transparent"/>' +
          '<circle r="3.6"/><text>' + (i + 1) + '</text></g>';
      }
    });
    if (view === 'front' || view === 'both') {
      var nameEl = this.$('[data-fc-belt]'), flagEl = this.$('[data-fc-flag]');
      var nm = nameEl ? nameEl.value.trim().toUpperCase() : '', fl = flagEl ? FLAGS[flagEl.value] : null;
      var ink = lum(hex[st.colours[0]]) > 0.55 ? '#1d1d1f' : '#ffffff';
      var nx = fl ? 163 : 158;
      if (fl) g += flagSvg(fl, 134, 224.5, 7.5, 5);
      if (nm) g += '<text x="' + nx + '" y="227" font-family="Arial Narrow,Arial,sans-serif" font-weight="700" font-size="5.2" fill="' + ink + '" text-anchor="middle" dominant-baseline="central"' + (nm.length > 12 ? ' textLength="' + (fl ? 38 : 46) + '" lengthAdjust="spacingAndGlyphs"' : '') + '>' + esc(nm) + '</text>';
    }
    g += '</g>';
    var vb = VB[view];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (vb[0] + ox) + ' ' + (vb[1] + oy) + ' ' + vb[2] + ' ' + vb[3] + '"' +
      (forExport ? ' width="' + vb[2] * 3 + '" height="' + vb[3] * 3 + '"' : ' role="img" aria-label="' + esc(this.cfg.title) + '"') +
      '><style>' + css + '</style>' + (forExport ? '<rect x="' + (vb[0] + ox) + '" y="' + (vb[1] + oy) + '" width="' + vb[2] + '" height="' + vb[3] + '" fill="#ececec"/>' : '') +
      body + g + '</svg>';
  };

  Configurator.prototype.draw = function () {
    var fig = this.$('[data-fc-fig]');
    if (!this.suits[this.st.design]) return;
    fig.innerHTML = this.svgMarkup(this.st.view, false);
    this.renderList();
    this.sync();
  };

  Configurator.prototype.variant = function () {
    var self = this;
    return this.cfg.variants.filter(function (v) {
      return (self.di < 0 || v.options[self.di] === self.st.design) && (self.si < 0 || v.options[self.si] === self.st.size);
    })[0];
  };

  Configurator.prototype.swatches = function (el, list, cur, cb) {
    var hex = this.hex;
    el.innerHTML = list.map(function (n) {
      return '<button type="button" class="fc-sw" style="background:' + hex[n] + '" title="' + esc(n) + '" aria-label="' + esc(n) + '" aria-pressed="' + (n === cur) + '" data-c="' + esc(n) + '"></button>';
    }).join('');
    el.onclick = function (e) { var b = e.target.closest('button'); if (b) cb(b.dataset.c); };
  };

  Configurator.prototype.renderControls = function () {
    var self = this, st = this.st;
    this.$('[data-fc-designs]').innerHTML = this.designs.map(function (d) {
      return '<button type="button" aria-pressed="' + (d === st.design) + '" data-d="' + esc(d) + '">' + esc(d) + '</button>';
    }).join('');
    var cg = this.$('[data-fc-colours]');
    cg.innerHTML = this.zones.map(function (z, i) {
      return '<div class="fc-group"><h3>' + esc(z) + ' <span>' + esc(st.colours[i]) + '</span></h3><div class="fc-sws" data-z="' + i + '"></div></div>';
    }).join('');
    var all = this.fabric.map(function (f) { return f[0]; });
    cg.querySelectorAll('.fc-sws').forEach(function (el) {
      var z = +el.dataset.z;
      self.swatches(el, all, st.colours[z], function (c) { st.colours[z] = c; self.renderControls(); self.draw(); });
    });
    this.swatches(this.$('[data-fc-stretch]'), this.stretchList, st.stretch, function (c) { st.stretch = c; self.renderControls(); self.draw(); });
    this.swatches(this.$('[data-fc-cuff]'), this.cuffList, st.cuff, function (c) { st.cuff = c; self.renderControls(); self.draw(); });
    this.$('[data-fc-stretch-name]').textContent = st.stretch;
    this.$('[data-fc-cuff-name]').textContent = st.cuff;
    this.$('[data-fc-design-name]').textContent = st.design;

    var sizes = [];
    this.cfg.variants.forEach(function (v) {
      if (self.di > -1 && v.options[self.di] !== st.design) return;
      var s = self.si > -1 ? v.options[self.si] : v.title;
      if (sizes.indexOf(s) < 0) sizes.push(s);
    });
    if (this.si > -1 && sizes.indexOf(st.size) < 0) st.size = sizes[0];
    var sel = this.$('[data-fc-size]');
    sel.innerHTML = sizes.map(function (s) { return '<option' + (s === st.size ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('');
    this.$('[data-fc-size-wrap]').hidden = this.si < 0;
  };

  Configurator.prototype.renderList = function () {
    var st = this.st, cfg = this.cfg;
    this.$('[data-fc-logos]').innerHTML = this.spots().map(function (sp, i) {
      var l = st.logos[sp[0]];
      return '<li class="' + (l ? 'has' : '') + '"><b>' + (i + 1) + '</b><span>' + esc(sp[1]) + (l ? '<small>' + esc(l.name) + '</small>' : '') + '</span>' +
        (l ? '<img src="' + l.url + '" alt="">' : '') +
        '<button type="button" class="fc-btn" data-k="' + sp[0] + '">' + esc(l ? cfg.changeText : cfg.addText) + '</button></li>';
    }).join('');
  };

  // Hidden form fields that travel with the order as line item properties
  Configurator.prototype.sync = function () {
    var v = this.variant(), st = this.st, self = this, f = this.form;
    var btn = this.$('[data-fc-submit]');
    if (v) {
      f.querySelector('input[name="id"]').value = v.id;
      this.$('[data-fc-price]').innerHTML = v.price;
      btn.disabled = !v.available;
      btn.querySelector('span').textContent = v.available ? this.cfg.addToCart : this.cfg.soldOut;
    } else {
      btn.disabled = true;
      btn.querySelector('span').textContent = this.cfg.unavailable;
    }
    var props = {};
    props[this.zones[0]] = st.colours[0];
    props[this.zones[1]] = st.colours[1];
    props[this.zones[2]] = st.colours[2];
    props[this.cfg.stretchLabel] = st.stretch;
    props[this.cfg.cuffLabel] = st.cuff;
    var box = this.$('[data-fc-props]');
    box.innerHTML = Object.keys(props).map(function (k) {
      return '<input type="hidden" name="properties[' + esc(k) + ']" value="' + esc(props[k]) + '">';
    }).join('');
    // file inputs for spots that are not used on this design are disabled so they are not submitted
    var keys = this.spots().map(function (s) { return s[0]; });
    f.querySelectorAll('input[type=file][data-k]').forEach(function (inp) {
      inp.disabled = keys.indexOf(inp.dataset.k) < 0 || !st.logos[inp.dataset.k];
    });
  };

  Configurator.prototype.openSpot = function (k) {
    var sp = this.spots().filter(function (s) { return s[0] === k; })[0]; if (!sp) return;
    if (sp[2] !== this.st.view) this.setView(sp[2]);
    this.cur = k;
    var d = this.$('dialog');
    d.querySelector('[data-fc-dlg-title]').textContent = sp[1];
    d.querySelector('[data-fc-remove]').hidden = !this.st.logos[k];
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
  };
  Configurator.prototype.useFile = function (file) {
    var self = this, k = this.cur; if (!file || !k) return;
    var inp = this.form.querySelector('input[type=file][data-k="' + k + '"]');
    if (file.size > 20 * 1024 * 1024) { alertText(this, this.cfg.tooBig); return; }
    try { var dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files; } catch (e) { /* older browser: picked straight into the input */ }
    var show = function (url) { self.st.logos[k] = { name: file.name, url: url }; self.$('dialog').close(); self.draw(); };
    if (/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type)) {
      var r = new FileReader(); r.onload = function () { show(r.result); }; r.readAsDataURL(file);
    } else {
      show(placeholder(file.name)); // PDF / AI / EPS: no browser preview, show a labelled tile
    }
  };
  function placeholder(name) {
    var ext = (name.split('.').pop() || 'file').toUpperCase().slice(0, 4);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 24"><rect width="60" height="24" rx="2" fill="#d9dbe0"/><text x="30" y="16" font-family="Arial" font-weight="700" font-size="11" text-anchor="middle" fill="#262833">' + esc(ext) + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function alertText(self, t) { var m = self.$('[data-fc-msg]'); m.textContent = t; m.hidden = false; }

  Configurator.prototype.setView = function (v) {
    this.st.view = v;
    this.root.querySelectorAll('[data-fc-view]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.fcView === v); });
    this.draw();
  };

  // Front+back PNG attached to the order as a private property, so the order shows the exact mock-up
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

  Configurator.prototype.preview = function () {
    var self = this;
    return new Promise(function (resolve) {
      try {
        var svg = self.svgMarkup('both', true);
        var img = new Image();
        img.onload = function () {
          var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          c.getContext('2d').drawImage(img, 0, 0);
          c.toBlob(function (b) { resolve(b); }, 'image/png');
        };
        img.onerror = function () { resolve(null); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      } catch (e) { resolve(null); }
      setTimeout(function () { resolve(null); }, 4000);
    });
  };

  Configurator.prototype.bind = function () {
    var self = this, root = this.root;
    var flagSel = this.$('[data-fc-flag]');
    if (flagSel) {
      flagSel.innerHTML = Object.keys(FLAGS).map(function (k) { return '<option value="' + k + '">' + k + '</option>'; }).join('');
      flagSel.addEventListener('change', function () { self.draw(); });
    }
    var beltIn = this.$('[data-fc-belt]');
    if (beltIn) beltIn.addEventListener('input', function () { self.draw(); });
    root.addEventListener('click', function (e) {
      var t = e.target;
      var v = t.closest('[data-fc-view]'); if (v) return self.setView(v.dataset.fcView);
      var d = t.closest('[data-fc-designs] button');
      if (d) { self.st.design = d.dataset.d; self.renderControls(); self.load(self.st.design); self.sync(); return; }
      var sp = t.closest('.fc-spot'); if (sp) return self.openSpot(sp.dataset.k);
      var lb = t.closest('[data-fc-logos] button'); if (lb) return self.openSpot(lb.dataset.k);
      if (t.closest('[data-fc-close]')) return self.$('dialog').close();
      if (t.closest('[data-fc-remove]')) {
        delete self.st.logos[self.cur];
        var inp = self.form.querySelector('input[type=file][data-k="' + self.cur + '"]'); if (inp) inp.value = '';
        self.$('dialog').close(); self.draw();
      }
      if (t.closest('[data-fc-choose]')) {
        var fi = self.form.querySelector('input[type=file][data-k="' + self.cur + '"]');
        fi.disabled = false; fi.click();
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
    this.$('[data-fc-size]').addEventListener('change', function (e) { self.st.size = e.target.value; self.sync(); });
    this.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = self.$('[data-fc-submit]'); if (btn.disabled) return;
      btn.disabled = true; btn.classList.add('is-busy');
      self.sync();
      self.preview().then(function (blob) {
        var pv = self.form.querySelector('[data-fc-preview]');
        if (blob && pv) {
          try { var dt = new DataTransfer(); dt.items.add(new File([blob], 'suit-mockup-' + self.st.design + '.png', { type: 'image/png' })); pv.files = dt.files; pv.disabled = false; } catch (err) { pv.disabled = true; }
        }
        try { var sv = self.form.querySelector('[data-fc-svg]'); var dt2 = new DataTransfer(); dt2.items.add(vectorFile(self.svgMarkup('both', true), 'suit-design-' + self.st.design + '.svg')); sv.files = dt2.files; sv.disabled = false; } catch (err2) {}
        HTMLFormElement.prototype.submit.call(self.form);
      });
    });
  };

  function init() {
    document.querySelectorAll('[data-freem-configurator]:not([data-ready])').forEach(function (el) {
      el.setAttribute('data-ready', '');
      try { new Configurator(el); } catch (e) { console.error('[FREEM configurator]', e); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  document.addEventListener('shopify:section:load', init);
})();
