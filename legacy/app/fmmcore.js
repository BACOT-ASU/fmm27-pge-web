// fmmcore.js — pembaca/penulis arsip .fmf FMM27 + parser data klub/kompetisi/negara
// Dipakai di browser (window.FMM) dan di Node (module.exports) untuk pengujian.
(function (root) {
  'use strict';
  var fz = (typeof fzstd !== 'undefined') ? fzstd : (typeof require !== 'undefined' ? require('fzstd') : null);
  var MAGIC = [0x02, 0x01, 0x66, 0x6d, 0x66, 0x2e, 0x08, 0x00, 0x00];
  var CHUNK = 131072;
  var te = new TextEncoder(), td = new TextDecoder('utf-8');

  function u64(dv, p) { return dv.getUint32(p, true) + dv.getUint32(p + 4, true) * 4294967296; }
  function putU64(dv, p, v) { dv.setUint32(p, v % 4294967296, true); dv.setUint32(p + 4, Math.floor(v / 4294967296), true); }
  function readBlob(blob, start, end) {
    var s = blob.slice(start, end);
    if (s.arrayBuffer) return s.arrayBuffer().then(function (b) { return new Uint8Array(b); });
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(new Uint8Array(r.result)); }; r.onerror = rej; r.readAsArrayBuffer(s); });
  }
  function checkMagic(b, p) { for (var i = 0; i < 9; i++) if (b[p + i] !== MAGIC[i]) return false; return true; }

  // ---------- zstd: baca daftar isi (rangkaian [u32 panjang + frame zstd]) ----------
  function decodeChunks(t, p) {
    var parts = [], total = 0;
    while (p + 4 <= t.length) {
      var dv = new DataView(t.buffer, t.byteOffset + p, 4); var len = dv.getUint32(0, true); p += 4;
      if (len === 0 || p + len > t.length) break;
      var out = fz.decompress(t.subarray(p, p + len)); parts.push(out); total += out.length; p += len;
    }
    var all = new Uint8Array(total), q = 0; parts.forEach(function (x) { all.set(x, q); q += x.length; });
    return all;
  }
  // ---------- zstd: tulis frame "raw block" (tanpa kompresi, sah menurut standar zstd) ----------
  function rawFrame(data) {
    var n = data.length; var f = new Uint8Array(4 + 1 + 4 + 3 + n);
    f.set([0x28, 0xb5, 0x2f, 0xfd], 0); f[4] = 0xA0; // single segment + FCS 4 byte
    new DataView(f.buffer).setUint32(5, n, true);
    var h = 1 | (0 << 1) | (n << 3); f[9] = h & 255; f[10] = (h >> 8) & 255; f[11] = (h >> 16) & 255;
    f.set(data, 12); return f;
  }
  function encodeChunks(raw) {
    var frames = [], total = 0;
    for (var p = 0; p < raw.length; p += CHUNK) {
      var fr = rawFrame(raw.subarray(p, Math.min(raw.length, p + CHUNK)));
      var hdr = new Uint8Array(4); new DataView(hdr.buffer).setUint32(0, fr.length, true);
      frames.push(hdr, fr); total += 4 + fr.length;
    }
    var out = new Uint8Array(total), q = 0; frames.forEach(function (x) { out.set(x, q); q += x.length; });
    return out;
  }

  // ---------- struktur daftar isi ----------
  function parseToc(o) {
    var p = 0, dv = new DataView(o.buffer, o.byteOffset, o.byteLength);
    function s() { var l = dv.getUint32(p, true); p += 4; var v = td.decode(o.subarray(p, p + l)); p += l; return v; }
    function folder() {
      var f = { name: s(), files: [], subs: [] }; var n = dv.getUint32(p, true); p += 4;
      for (var i = 0; i < n; i++) {
        var nm = s(), ex = s();
        f.files.push({ name: nm, ext: ex, off: u64(dv, p), size: u64(dv, p + 8), usize: u64(dv, p + 16), t1: u64(dv, p + 24), t2: u64(dv, p + 32) }); p += 40;
      }
      var k = dv.getUint32(p, true); p += 4;
      for (var j = 0; j < k; j++) f.subs.push(folder());
      return f;
    }
    var r = folder(); if (p !== o.length) throw new Error('Daftar isi tidak habis terbaca (' + p + '/' + o.length + ')');
    return r;
  }
  function serializeToc(root) {
    var parts = [], total = 0;
    function push(b) { parts.push(b); total += b.length; }
    function u32(v) { var b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v, true); push(b); }
    function str(v) { var b = te.encode(v); u32(b.length); push(b); }
    function folder(f) {
      str(f.name); u32(f.files.length);
      f.files.forEach(function (x) {
        str(x.name); str(x.ext); var b = new Uint8Array(40), dv = new DataView(b.buffer);
        putU64(dv, 0, x.off); putU64(dv, 8, x.size); putU64(dv, 16, x.usize); putU64(dv, 24, x.t1); putU64(dv, 32, x.t2); push(b);
      });
      u32(f.subs.length); f.subs.forEach(folder);
    }
    folder(root);
    var out = new Uint8Array(total), q = 0; parts.forEach(function (x) { out.set(x, q); q += x.length; });
    return out;
  }
  function walk(f, pre, cb) {
    var path = pre ? pre + '/' + f.name : f.name;
    f.files.forEach(function (x) { cb(path + '/' + x.name + x.ext, x, f); });
    f.subs.forEach(function (s) { walk(s, path, cb); });
  }
  function findFolder(root, path) {
    var parts = path.split('/'); if (parts[0] !== root.name) return null; var f = root;
    for (var i = 1; i < parts.length; i++) { f = f.subs.filter(function (s) { return s.name === parts[i]; })[0]; if (!f) return null; }
    return f;
  }

  // Buka arsip .fmf: hanya membaca header dan daftar isi (cocok untuk file 1,7 GB)
  function openFmf(blob) {
    return readBlob(blob, 0, 26).then(function (h) {
      if (!checkMagic(h, 0)) throw new Error('Bukan file .fmf FMM');
      var dv = new DataView(h.buffer); var X = u64(dv, 9); var flag = h[25];
      if (flag !== 0) throw new Error('Arsip ini memakai isi terkompresi (flag ' + flag + '); belum didukung');
      return readBlob(blob, 9 + X, blob.size).then(function (t) {
        if (!checkMagic(t, 0)) throw new Error('Daftar isi tidak ditemukan');
        var raw = decodeChunks(t, 9);
        return { blob: blob, header: h, X: X, dataLen: X - 17, root: parseToc(raw) };
      });
    });
  }
  function getFile(arc, entry) { return readBlob(arc.blob, 26 + entry.off, 26 + entry.off + entry.size); }

  // Susun arsip baru. changes: [{folder:'a/b', name, ext, data:Uint8Array}] — ganti jika ada, tambah jika belum.
  // Kembalikan daftar bagian (Blob/Uint8Array) yang disambung = file baru. Data lama tidak disalin ke memori.
  function buildFmf(arc, changes) {
    var now = Math.floor(Date.now() / 1000); var extra = [], pos = arc.dataLen;
    changes.forEach(function (c) {
      var f = findFolder(arc.root, c.folder);
      if (!f) throw new Error('Folder tidak ada di arsip: ' + c.folder);
      var e = f.files.filter(function (x) { return x.name === c.name && x.ext === c.ext; })[0];
      if (!e) { e = { name: c.name, ext: c.ext, t1: now, t2: now }; f.files.push(e); }
      e.off = pos; e.size = c.data.length; e.usize = c.data.length; e.t1 = now; e.t2 = now;
      extra.push(c.data); pos += c.data.length;
    });
    var toc = serializeToc(arc.root);
    var tocBlock = encodeChunks(toc);
    var head = new Uint8Array(arc.header); var dv = new DataView(head.buffer);
    putU64(dv, 9, 17 + pos);
    var magic = new Uint8Array(MAGIC);
    var parts = [head, arc.blob.slice(26, 26 + arc.dataLen)].concat(extra, [magic, tocBlock]);
    return { parts: parts, size: 26 + pos + 9 + tocBlock.length };
  }

  // ---------- data database ----------
  function strAt(b, dv, p) { var l = dv.getUint32(p, true); return { v: td.decode(b.subarray(p + 4, p + 4 + l)), p: p + 4 + l }; }
  function parseCompetitions(b) {
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength); var n = dv.getUint16(8, true), p = 10, out = [];
    for (var i = 0; i < n; i++) {
      var idx = dv.getUint16(p, true), uid = dv.getUint32(p + 2, true); p += 6;
      var a = strAt(b, dv, p); p = a.p + 1; var s2 = strAt(b, dv, p); p = s2.p + 1; var ab = strAt(b, dv, p); p = ab.p;
      var type = b[p], nat = dv.getInt16(p + 3, true), rep = dv.getUint16(p + 9, true), level = b[p + 11], parent = dv.getInt16(p + 12, true);
      var cnt = dv.getUint32(p + 14, true); p += 18 + 8 * cnt + 20;
      out.push({ idx: idx, uid: uid, name: a.v, short: s2.v, abbr: ab.v, type: type, nat: nat, rep: rep, level: level, parent: parent });
    }
    if (p !== b.length) throw new Error('competition.dat tidak terbaca sampai akhir');
    return out;
  }
  function parseClubs(b) {
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength); var n = dv.getUint32(8, true), p = 12, out = [];
    function s(ff) { var l = dv.getUint32(p, true); if (l > 120) throw new Error('club.dat: teks rusak di ' + p); p += 4; var v = td.decode(b.subarray(p, p + l)); p += l; if (ff) p += 1; return v; }
    for (var i = 0; i < n; i++) {
      var uid = dv.getUint32(p + 4, true); p += 8;
      var lname = s(1), sname = s(1); s(0); s(0); s(0);
      var nat = dv.getInt16(p, true), based = dv.getInt16(p + 2, true); p += 4 + 12 + 132 + 10;
      var div = dv.getInt16(p, true); p += 4 + 1 + 2 + 2;
      var flag = b[p]; p += 1; if (flag === 1) p += 68; else if (flag !== 0) throw new Error('club.dat: flag ' + flag);
      var k = dv.getUint32(p, true); p += 4 + k + 3 + 8 + 12;
      var x = dv.getUint16(p, true); p += 2 + 21 * x;
      var m = dv.getUint16(p, true); p += 2 + 4 * m;
      p += 48 + 4 + 27 + 44 + 2;
      out.push({ uid: uid, name: lname, short: sname, nat: nat, based: based, div: div, squad: m });
    }
    return out;
  }
  function parseNations(b) {
    // record: u32 uid, u16 idx, u32 len, nama, 0xff ... (panjang record bervariasi; cari berurutan)
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength); var n = dv.getUint16(8, true), out = [], p = 10;
    for (var i = 0; i < n; i++) {
      var found = -1;
      for (var q = p; q < b.length - 12; q++) {
        if (dv.getUint16(q + 4, true) !== i) continue;
        var l = dv.getUint32(q + 6, true); if (l < 2 || l > 60) continue;
        if (b[q + 10 + l] !== 0xff) continue;
        var ok = true; for (var z = 0; z < l; z++) { var c = b[q + 10 + z]; if (c < 0x20) { ok = false; break; } }
        if (ok) { found = q; break; }
      }
      if (found < 0) break;
      var l2 = dv.getUint32(found + 6, true);
      out.push({ idx: i, uid: dv.getUint32(found, true), name: td.decode(b.subarray(found + 10, found + 10 + l2)) });
      p = found + 11 + l2;
    }
    return out;
  }
  function openDb(blob) {
    return openFmf(blob).then(function (arc) {
      var want = { 'club.dat': null, 'competition.dat': null, 'nation.dat': null };
      walk(arc.root, '', function (path, e) { var nm = e.name + e.ext; if (nm in want) want[nm] = e; });
      for (var k in want) if (!want[k]) throw new Error(k + ' tidak ada di arsip database');
      return Promise.all([getFile(arc, want['club.dat']), getFile(arc, want['competition.dat']), getFile(arc, want['nation.dat'])]).then(function (r) {
        return { clubs: parseClubs(r[0]), comps: parseCompetitions(r[1]), nations: parseNations(r[2]) };
      });
    });
  }

  // ---------- logo ----------
  var LOGO_BASE = 'pictures_logos/logos';
  // logo besar (normal) dipanggil ".../logo", logo kecil (small) ".../icon"
  function suffixOf(size) { return size === 'normal' ? 'logo' : 'icon'; }
  function parseLogoConfig(text) {
    var map = {}; var re = /<record from="([^"]*)" to="graphics\/pictures\/(club|comp)\/(\d+)\/(?:icon|logo)"\/>/g, m;
    while ((m = re.exec(text))) map[m[3]] = m[1];
    return map;
  }
  function openLogos(blob) {
    return openFmf(blob).then(function (arc) {
      var idx = {}; // 'normal/clubs/<from>' -> entry
      var cfgEntries = {};
      walk(arc.root, '', function (path, e) {
        var rel = path.slice(LOGO_BASE.length + 1);
        if (/\/config\.xml$/.test(rel)) cfgEntries[rel.replace(/\/config\.xml$/, '')] = e;
        else if (/\.png$/.test(rel)) idx[rel.replace(/\.png$/, '')] = e;
      });
      var keys = ['normal/clubs', 'small/clubs', 'normal/comps', 'small/comps'];
      return Promise.all(keys.map(function (k) { return cfgEntries[k] ? getFile(arc, cfgEntries[k]) : Promise.resolve(null); })).then(function (cfgs) {
        var configs = {}, maps = {};
        keys.forEach(function (k, i) { if (cfgs[i]) { configs[k] = td.decode(cfgs[i]); maps[k] = parseLogoConfig(configs[k]); } });
        return { arc: arc, png: idx, configs: configs, maps: maps };
      });
    });
  }
  // kind: 'clubs' | 'comps'; size: 'normal' | 'small'
  function findLogo(lg, kind, size, id) {
    var key = size + '/' + kind; var from = lg.maps[key] && lg.maps[key][String(id)];
    if (!from) return null; return lg.png[key + '/' + from] || null;
  }
  function editConfig(text, kind, ids, suffix) {
    var t = kind === 'clubs' ? 'club' : 'comp'; suffix = suffix || 'icon';
    ids.forEach(function (id) {
      var to = 'graphics/pictures/' + t + '/' + id + '/' + suffix;
      var reOld = new RegExp('[ \\t]*<record from="[^"]*" to="' + to.replace(/\//g, '\\/') + '"\\/>\\r?\\n', 'g');
      text = text.replace(reOld, '');
      var nl = text.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
      var line = '\t\t<record from="custom/' + id + '" to="' + to + '"/>' + nl;
      var i = text.lastIndexOf('</list>'); if (i < 0) throw new Error('config.xml logo tidak dikenali');
      var ls = text.lastIndexOf('\n', i) + 1;
      text = text.slice(0, ls) + line + text.slice(ls);
    });
    return text;
  }
  // items: [{kind:'clubs'|'comps', id, normal:Uint8Array, small:Uint8Array}]
  function buildLogoArchive(lg, items) {
    var changes = [], byKey = {};
    items.forEach(function (it) {
      ['normal', 'small'].forEach(function (sz) {
        var key = sz + '/' + it.kind; (byKey[key] = byKey[key] || []).push(String(it.id));
        changes.push({ folder: LOGO_BASE + '/' + key + '/custom', name: String(it.id), ext: '.png', data: it[sz] });
      });
    });
    Object.keys(byKey).forEach(function (key) {
      if (!lg.configs[key]) throw new Error('config.xml untuk ' + key + ' tidak ada');
      var txt = editConfig(lg.configs[key], key.split('/')[1], byKey[key], suffixOf(key.split('/')[0]));
      changes.push({ folder: LOGO_BASE + '/' + key, name: 'config', ext: '.xml', data: te.encode(txt) });
    });
    return buildFmf(lg.arc, changes);
  }
  // Paket untuk folder Documents: config.xml + PNG 180x180
  function documentsConfig(items) {
    var lines = [];
    items.forEach(function (it) {
      var t = it.kind === 'clubs' ? 'club' : 'comp';
      ['logo', 'icon'].forEach(function (sfx) {
        lines.push('    <record from="' + t + '_' + it.id + '" to="graphics/pictures/' + t + '/' + it.id + '/' + sfx + '"/>');
      });
    });
    return "<?xml version='1.0' encoding='utf-8'?>\n<record>\n  <boolean id=\"preload\" value=\"false\"/>\n  <!--logo mappings-->\n  <list id=\"maps\">\n" + lines.join('\n') + '\n  </list>\n</record>\n';
  }

  // ---------- zip sederhana (tanpa kompresi) ----------
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function makeZip(files) { // [{name, data:Uint8Array}]
    var parts = [], central = [], off = 0;
    files.forEach(function (f) {
      var nm = te.encode(f.name), crc = crc32(f.data), h = new Uint8Array(30), dv = new DataView(h.buffer);
      dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(8, 0, true);
      dv.setUint32(14, crc, true); dv.setUint32(18, f.data.length, true); dv.setUint32(22, f.data.length, true); dv.setUint16(12, 0x5B71, true); dv.setUint16(26, nm.length, true);
      parts.push(h, nm, f.data);
      var c = new Uint8Array(46), cv = new DataView(c.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint32(16, crc, true); cv.setUint32(20, f.data.length, true); cv.setUint32(24, f.data.length, true); cv.setUint16(14, 0x5B71, true); cv.setUint16(28, nm.length, true); cv.setUint32(42, off, true);
      central.push(c, nm); off += 30 + nm.length + f.data.length;
    });
    var cs = 0; central.forEach(function (x) { cs += x.length; });
    var e = new Uint8Array(22), ev = new DataView(e.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, cs, true); ev.setUint32(16, off, true);
    return parts.concat(central, [e]);
  }

  var api = { openFmf: openFmf, getFile: getFile, buildFmf: buildFmf, walk: walk, openDb: openDb, openLogos: openLogos, findLogo: findLogo,
    buildLogoArchive: buildLogoArchive, documentsConfig: documentsConfig, makeZip: makeZip, encodeChunks: encodeChunks, decodeChunks: decodeChunks,
    parseClubs: parseClubs, parseCompetitions: parseCompetitions, parseNations: parseNations, editConfig: editConfig };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FMM = api;
})(this);
