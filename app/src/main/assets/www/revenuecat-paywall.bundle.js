var ReclipRevenueCatPaywallModule = (() => {
  // node_modules/@revenuecat/purchases-js/dist/Purchases.es.js
  var vi = Object.create;
  var Qr = Object.defineProperty;
  var pi = Object.getOwnPropertyDescriptor;
  var Rt = (e, r) => (r = Symbol[e]) ? r : Symbol.for("Symbol." + e);
  var lr = (e) => {
    throw TypeError(e);
  };
  var St = (e, r, t) => r in e ? Qr(e, r, { enumerable: true, configurable: true, writable: true, value: t }) : e[r] = t;
  var Ot = (e, r) => Qr(e, "name", { value: r, configurable: true });
  var Ut = (e) => [, , , vi((e == null ? void 0 : e[Rt("metadata")]) ?? null)];
  var Lt = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
  var sr = (e) => e !== void 0 && typeof e != "function" ? lr("Function expected") : e;
  var hi = (e, r, t, n, i) => ({ kind: Lt[e], name: r, metadata: n, addInitializer: (o) => t._ ? lr("Already initialized") : i.push(sr(o || null)) });
  var Zr = (e, r) => St(r, Rt("metadata"), e[3]);
  var $t = (e, r, t, n) => {
    for (var i = 0, o = e[r >> 1], a = o && o.length; i < a; i++) r & 1 ? o[i].call(t) : n = o[i].call(t, n);
    return n;
  };
  var Dt = (e, r, t, n, i, o) => {
    var a, s, u, l, f, c = r & 7, d = !!(r & 8), p = !!(r & 16), E = c > 3 ? e.length + 1 : c ? d ? 1 : 2 : 0, m = Lt[c + 5], P = c > 3 && (e[E - 1] = []), b = e[E] || (e[E] = []), y = c && (!p && !d && (i = i.prototype), c < 5 && (c > 3 || !p) && pi(c < 4 ? i : { get [t]() {
      return kt(this, o);
    }, set [t](_) {
      return Nt(this, o, _);
    } }, t));
    c ? p && c < 4 && Ot(o, (c > 2 ? "set " : c > 1 ? "get " : "") + t) : Ot(i, t);
    for (var I = n.length - 1; I >= 0; I--)
      l = hi(c, t, u = {}, e[3], b), c && (l.static = d, l.private = p, f = l.access = { has: p ? (_) => _i(i, _) : (_) => t in _ }, c ^ 3 && (f.get = p ? (_) => (c ^ 1 ? kt : gi)(_, i, c ^ 4 ? o : y.get) : (_) => _[t]), c > 2 && (f.set = p ? (_, x) => Nt(_, i, x, c ^ 4 ? o : y.set) : (_, x) => _[t] = x)), s = (0, n[I])(c ? c < 4 ? p ? o : y[m] : c > 4 ? void 0 : { get: y.get, set: y.set } : i, l), u._ = 1, c ^ 4 || s === void 0 ? sr(s) && (c > 4 ? P.unshift(s) : c ? p ? o = s : y[m] = s : i = s) : typeof s != "object" || s === null ? lr("Object expected") : (sr(a = s.get) && (y.get = a), sr(a = s.set) && (y.set = a), sr(a = s.init) && P.unshift(a));
    return c || Zr(e, i), y && Qr(i, t, y), p ? c ^ 4 ? o : y : i;
  };
  var N = (e, r, t) => St(e, typeof r != "symbol" ? r + "" : r, t);
  var Xr = (e, r, t) => r.has(e) || lr("Cannot " + t);
  var _i = (e, r) => Object(r) !== r ? lr('Cannot use the "in" operator on this value') : e.has(r);
  var kt = (e, r, t) => (Xr(e, r, "read from private field"), t ? t.call(e) : r.get(e));
  var Nt = (e, r, t, n) => (Xr(e, r, "write to private field"), n ? n.call(e, t) : r.set(e, t), t);
  var gi = (e, r, t) => (Xr(e, r, "access private method"), t);
  var mi = "5";
  typeof window < "u" && (window.__svelte || (window.__svelte = { v: /* @__PURE__ */ new Set() })).v.add(mi);
  var Xe = false;
  function bi() {
    Xe = true;
  }
  bi();
  var yi = 1;
  var Ei = 2;
  var wi = 4;
  var Ii = 8;
  var xi = 16;
  var Pi = 1;
  var Ti = 2;
  var ae = Symbol();
  var sn = "http://www.w3.org/2000/svg";
  var Fr = Array.isArray;
  var Oi = Array.from;
  var ki = Object.defineProperty;
  var $e = Object.getOwnPropertyDescriptor;
  var ln = Object.getOwnPropertyDescriptors;
  var Ni = Object.prototype;
  var Ri = Array.prototype;
  var Ur = Object.getPrototypeOf;
  function Si(e) {
    return e();
  }
  function rt(e) {
    for (var r = 0; r < e.length; r++)
      e[r]();
  }
  var xe = 2;
  var cn = 4;
  var br = 8;
  var vt = 16;
  var he = 32;
  var yr = 64;
  var Be = 128;
  var Lr = 256;
  var Z = 512;
  var Ae = 1024;
  var Je = 2048;
  var Ke = 4096;
  var Er = 8192;
  var Ui = 16384;
  var qr = 32768;
  var Li = 65536;
  var $i = 1 << 18;
  var un = 1 << 19;
  var We = Symbol("$state");
  var Di = Symbol("");
  function fn(e) {
    return e === this.v;
  }
  function Mi(e, r) {
    return e != e ? r == r : e !== r || e !== null && typeof e == "object" || typeof e == "function";
  }
  function pt(e) {
    return !Mi(e, this.v);
  }
  function Bi(e) {
    throw new Error("effect_in_teardown");
  }
  function Fi() {
    throw new Error("effect_in_unowned_derived");
  }
  function qi(e) {
    throw new Error("effect_orphan");
  }
  function Ci() {
    throw new Error("effect_update_depth_exceeded");
  }
  function ji(e) {
    throw new Error("lifecycle_legacy_only");
  }
  function Hi(e) {
    throw new Error("props_invalid_value");
  }
  function Vi() {
    throw new Error("state_descriptors_fixed");
  }
  function Gi() {
    throw new Error("state_prototype_fixed");
  }
  function Yi() {
    throw new Error("state_unsafe_local_read");
  }
  function Wi() {
    throw new Error("state_unsafe_mutation");
  }
  function ye(e) {
    return {
      f: 0,
      // TODO ideally we could skip this altogether, but it causes type errors
      v: e,
      reactions: null,
      equals: fn,
      version: 0
    };
  }
  // @__NO_SIDE_EFFECTS__
  function dn(e, r = false) {
    var n;
    const t = ye(e);
    return r || (t.equals = pt), Xe && S !== null && S.l !== null && ((n = S.l).s ?? (n.s = [])).push(t), t;
  }
  function ue(e, r = false) {
    return /* @__PURE__ */ zi(/* @__PURE__ */ dn(e, r));
  }
  // @__NO_SIDE_EFFECTS__
  function zi(e) {
    return D !== null && D.f & xe && (Ee === null ? to([e]) : Ee.push(e)), e;
  }
  function O(e, r) {
    return D !== null && Hr() && D.f & (xe | vt) && // If the source was created locally within the current derived, then
    // we allow the mutation.
    (Ee === null || !Ee.includes(e)) && Wi(), Ki(e, r);
  }
  function Ki(e, r) {
    return e.equals(r) || (e.v = r, e.version = Tn(), vn(e, Ae), Hr() && U !== null && U.f & Z && !(U.f & he) && (W !== null && W.includes(e) ? (_e(U, Ae), Vr(U)) : Te === null ? no([e]) : Te.push(e))), r;
  }
  function vn(e, r) {
    var t = e.reactions;
    if (t !== null)
      for (var n = Hr(), i = t.length, o = 0; o < i; o++) {
        var a = t[o], s = a.f;
        s & Ae || !n && a === U || (_e(a, r), s & (Z | Be) && (s & xe ? vn(
          /** @type {Derived} */
          a,
          Je
        ) : Vr(
          /** @type {Effect} */
          a
        )));
      }
  }
  // @__NO_SIDE_EFFECTS__
  function $r(e) {
    var r = xe | Ae;
    U === null ? r |= Be : U.f |= un;
    const t = {
      children: null,
      ctx: S,
      deps: null,
      equals: fn,
      f: r,
      fn: e,
      reactions: null,
      v: (
        /** @type {V} */
        null
      ),
      version: 0,
      parent: U
    };
    if (D !== null && D.f & xe) {
      var n = (
        /** @type {Derived} */
        D
      );
      (n.children ?? (n.children = [])).push(t);
    }
    return t;
  }
  // @__NO_SIDE_EFFECTS__
  function ce(e) {
    const r = /* @__PURE__ */ $r(e);
    return r.equals = pt, r;
  }
  function pn(e) {
    var r = e.children;
    if (r !== null) {
      e.children = null;
      for (var t = 0; t < r.length; t += 1) {
        var n = r[t];
        n.f & xe ? ht(
          /** @type {Derived} */
          n
        ) : ke(
          /** @type {Effect} */
          n
        );
      }
    }
  }
  function hn(e) {
    var r, t = U;
    we(e.parent);
    try {
      pn(e), r = An(e);
    } finally {
      we(t);
    }
    return r;
  }
  function _n(e) {
    var r = hn(e), t = (Ye || e.f & Be) && e.deps !== null ? Je : Z;
    _e(e, t), e.equals(r) || (e.v = r, e.version = Tn());
  }
  function ht(e) {
    pn(e), gr(e, 0), _e(e, Er), e.v = e.children = e.deps = e.ctx = e.reactions = null;
  }
  function gn(e) {
    U === null && D === null && qi(), D !== null && D.f & Be && Fi(), mt && Bi();
  }
  function Qi(e, r) {
    var t = r.last;
    t === null ? r.last = r.first = e : (t.next = e, e.prev = t, r.last = e);
  }
  function er(e, r, t, n = true) {
    var i = (e & yr) !== 0, o = U, a = {
      ctx: S,
      deps: null,
      deriveds: null,
      nodes_start: null,
      nodes_end: null,
      f: e | Ae,
      first: null,
      fn: r,
      last: null,
      next: null,
      parent: i ? null : o,
      prev: null,
      teardown: null,
      transitions: null,
      version: 0
    };
    if (t) {
      var s = ze;
      try {
        Mt(true), xr(a), a.f |= Ui;
      } catch (f) {
        throw ke(a), f;
      } finally {
        Mt(s);
      }
    } else r !== null && Vr(a);
    var u = t && a.deps === null && a.first === null && a.nodes_start === null && a.teardown === null && (a.f & un) === 0;
    if (!u && !i && n && (o !== null && Qi(a, o), D !== null && D.f & xe)) {
      var l = (
        /** @type {Derived} */
        D
      );
      (l.children ?? (l.children = [])).push(a);
    }
    return a;
  }
  function mn(e) {
    const r = er(br, null, false);
    return _e(r, Z), r.teardown = e, r;
  }
  function tt(e) {
    gn();
    var r = U !== null && (U.f & he) !== 0 && S !== null && !S.m;
    if (r) {
      var t = (
        /** @type {ComponentContext} */
        S
      );
      (t.e ?? (t.e = [])).push({
        fn: e,
        effect: U,
        reaction: D
      });
    } else {
      var n = _t(e);
      return n;
    }
  }
  function Zi(e) {
    return gn(), wr(e);
  }
  function Xi(e) {
    const r = er(yr, e, true);
    return () => {
      ke(r);
    };
  }
  function _t(e) {
    return er(cn, e, false);
  }
  function De(e, r) {
    var t = (
      /** @type {ComponentContextLegacy} */
      S
    ), n = { effect: null, ran: false };
    t.l.r1.push(n), n.effect = wr(() => {
      e(), !n.ran && (n.ran = true, O(t.l.r2, true), Qe(r));
    });
  }
  function gt() {
    var e = (
      /** @type {ComponentContextLegacy} */
      S
    );
    wr(() => {
      if (v(e.l.r2)) {
        for (var r of e.l.r1) {
          var t = r.effect;
          t.f & Z && _e(t, Je), rr(t) && xr(t), r.ran = false;
        }
        e.l.r2.v = false;
      }
    });
  }
  function wr(e) {
    return er(br, e, true);
  }
  function C(e) {
    return Cr(e);
  }
  function Cr(e, r = 0) {
    return er(br | vt | r, e, true);
  }
  function _r(e, r = true) {
    return er(br | he, e, true, r);
  }
  function bn(e) {
    var r = e.teardown;
    if (r !== null) {
      const t = mt, n = D;
      Bt(true), Oe(null);
      try {
        r.call(null);
      } finally {
        Bt(t), Oe(n);
      }
    }
  }
  function yn(e) {
    var r = e.deriveds;
    if (r !== null) {
      e.deriveds = null;
      for (var t = 0; t < r.length; t += 1)
        ht(r[t]);
    }
  }
  function En(e, r = false) {
    var t = e.first;
    for (e.first = e.last = null; t !== null; ) {
      var n = t.next;
      ke(t, r), t = n;
    }
  }
  function Ji(e) {
    for (var r = e.first; r !== null; ) {
      var t = r.next;
      r.f & he || ke(r), r = t;
    }
  }
  function ke(e, r = true) {
    var t = false;
    if ((r || e.f & $i) && e.nodes_start !== null) {
      for (var n = e.nodes_start, i = e.nodes_end; n !== null; ) {
        var o = n === i ? null : (
          /** @type {TemplateNode} */
          /* @__PURE__ */ bt(n)
        );
        n.remove(), n = o;
      }
      t = true;
    }
    En(e, r && !t), yn(e), gr(e, 0), _e(e, Er);
    var a = e.transitions;
    if (a !== null)
      for (const u of a)
        u.stop();
    bn(e);
    var s = e.parent;
    s !== null && s.first !== null && wn(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.parent = e.fn = e.nodes_start = e.nodes_end = null;
  }
  function wn(e) {
    var r = e.parent, t = e.prev, n = e.next;
    t !== null && (t.next = n), n !== null && (n.prev = t), r !== null && (r.first === e && (r.first = n), r.last === e && (r.last = t));
  }
  function nt(e, r) {
    var t = [];
    In(e, t, true), eo(t, () => {
      ke(e), r && r();
    });
  }
  function eo(e, r) {
    var t = e.length;
    if (t > 0) {
      var n = () => --t || r();
      for (var i of e)
        i.out(n);
    } else
      r();
  }
  function In(e, r, t) {
    if (!(e.f & Ke)) {
      if (e.f ^= Ke, e.transitions !== null)
        for (const a of e.transitions)
          (a.is_global || t) && r.push(a);
      for (var n = e.first; n !== null; ) {
        var i = n.next, o = (n.f & qr) !== 0 || (n.f & he) !== 0;
        In(n, r, o ? t : false), n = i;
      }
    }
  }
  function it(e) {
    xn(e, true);
  }
  function xn(e, r) {
    if (e.f & Ke) {
      rr(e) && xr(e), e.f ^= Ke;
      for (var t = e.first; t !== null; ) {
        var n = t.next, i = (t.f & qr) !== 0 || (t.f & he) !== 0;
        xn(t, i ? r : false), t = n;
      }
      if (e.transitions !== null)
        for (const o of e.transitions)
          (o.is_global || r) && o.in();
    }
  }
  var ot = false;
  var at = [];
  function ro() {
    ot = false;
    const e = at.slice();
    at = [], rt(e);
  }
  function Ir(e) {
    ot || (ot = true, queueMicrotask(ro)), at.push(e);
  }
  function jr(e) {
    throw new Error("lifecycle_outside_component");
  }
  var Dr = false;
  var ze = false;
  var mt = false;
  function Mt(e) {
    ze = e;
  }
  function Bt(e) {
    mt = e;
  }
  var st = [];
  var vr = 0;
  var D = null;
  function Oe(e) {
    D = e;
  }
  var U = null;
  function we(e) {
    U = e;
  }
  var Ee = null;
  function to(e) {
    Ee = e;
  }
  var W = null;
  var le = 0;
  var Te = null;
  function no(e) {
    Te = e;
  }
  var Pn = 0;
  var Ye = false;
  var S = null;
  function Tn() {
    return ++Pn;
  }
  function Hr() {
    return !Xe || S !== null && S.l === null;
  }
  function rr(e) {
    var a, s;
    var r = e.f;
    if (r & Ae)
      return true;
    if (r & Je) {
      var t = e.deps, n = (r & Be) !== 0;
      if (t !== null) {
        var i;
        if (r & Lr) {
          for (i = 0; i < t.length; i++)
            ((a = t[i]).reactions ?? (a.reactions = [])).push(e);
          e.f ^= Lr;
        }
        for (i = 0; i < t.length; i++) {
          var o = t[i];
          if (rr(
            /** @type {Derived} */
            o
          ) && _n(
            /** @type {Derived} */
            o
          ), n && U !== null && !Ye && !((s = o == null ? void 0 : o.reactions) != null && s.includes(e)) && (o.reactions ?? (o.reactions = [])).push(e), o.version > e.version)
            return true;
        }
      }
      n || _e(e, Z);
    }
    return false;
  }
  function io(e, r, t) {
    throw e;
  }
  function An(e) {
    var d;
    var r = W, t = le, n = Te, i = D, o = Ye, a = Ee, s = S, u = e.f;
    W = /** @type {null | Value[]} */
    null, le = 0, Te = null, D = u & (he | yr) ? null : e, Ye = !ze && (u & Be) !== 0, Ee = null, S = e.ctx;
    try {
      var l = (
        /** @type {Function} */
        (0, e.fn)()
      ), f = e.deps;
      if (W !== null) {
        var c;
        if (gr(e, le), f !== null && le > 0)
          for (f.length = le + W.length, c = 0; c < W.length; c++)
            f[le + c] = W[c];
        else
          e.deps = f = W;
        if (!Ye)
          for (c = le; c < f.length; c++)
            ((d = f[c]).reactions ?? (d.reactions = [])).push(e);
      } else f !== null && le < f.length && (gr(e, le), f.length = le);
      return l;
    } finally {
      W = r, le = t, Te = n, D = i, Ye = o, Ee = a, S = s;
    }
  }
  function oo(e, r) {
    let t = r.reactions;
    if (t !== null) {
      var n = t.indexOf(e);
      if (n !== -1) {
        var i = t.length - 1;
        i === 0 ? t = r.reactions = null : (t[n] = t[i], t.pop());
      }
    }
    t === null && r.f & xe && // Destroying a child effect while updating a parent effect can cause a dependency to appear
    // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
    // allows us to skip the expensive work of disconnecting and immediately reconnecting it
    (W === null || !W.includes(r)) && (_e(r, Je), r.f & (Be | Lr) || (r.f ^= Lr), gr(
      /** @type {Derived} **/
      r,
      0
    ));
  }
  function gr(e, r) {
    var t = e.deps;
    if (t !== null)
      for (var n = r; n < t.length; n++)
        oo(e, t[n]);
  }
  function xr(e) {
    var r = e.f;
    if (!(r & Er)) {
      _e(e, Z);
      var t = U;
      U = e;
      try {
        r & vt ? Ji(e) : En(e), yn(e), bn(e);
        var n = An(e);
        e.teardown = typeof n == "function" ? n : null, e.version = Pn;
      } catch (i) {
        io(
          /** @type {Error} */
          i
        );
      } finally {
        U = t;
      }
    }
  }
  function ao() {
    vr > 1e3 && (vr = 0, Ci()), vr++;
  }
  function so(e) {
    var r = e.length;
    if (r !== 0) {
      ao();
      var t = ze;
      ze = true;
      try {
        for (var n = 0; n < r; n++) {
          var i = e[n];
          i.f & Z || (i.f ^= Z);
          var o = [];
          On(i, o), lo(o);
        }
      } finally {
        ze = t;
      }
    }
  }
  function lo(e) {
    var r = e.length;
    if (r !== 0)
      for (var t = 0; t < r; t++) {
        var n = e[t];
        !(n.f & (Er | Ke)) && rr(n) && (xr(n), n.deps === null && n.first === null && n.nodes_start === null && (n.teardown === null ? wn(n) : n.fn = null));
      }
  }
  function co() {
    if (Dr = false, vr > 1001)
      return;
    const e = st;
    st = [], so(e), Dr || (vr = 0);
  }
  function Vr(e) {
    Dr || (Dr = true, queueMicrotask(co));
    for (var r = e; r.parent !== null; ) {
      r = r.parent;
      var t = r.f;
      if (t & (yr | he)) {
        if (!(t & Z)) return;
        r.f ^= Z;
      }
    }
    st.push(r);
  }
  function On(e, r) {
    var t = e.first, n = [];
    e: for (; t !== null; ) {
      var i = t.f, o = (i & he) !== 0, a = o && (i & Z) !== 0;
      if (!a && !(i & Ke))
        if (i & br) {
          o ? t.f ^= Z : rr(t) && xr(t);
          var s = t.first;
          if (s !== null) {
            t = s;
            continue;
          }
        } else i & cn && n.push(t);
      var u = t.next;
      if (u === null) {
        let c = t.parent;
        for (; c !== null; ) {
          if (e === c)
            break e;
          var l = c.next;
          if (l !== null) {
            t = l;
            continue e;
          }
          c = c.parent;
        }
      }
      t = u;
    }
    for (var f = 0; f < n.length; f++)
      s = n[f], r.push(s), On(s, r);
  }
  function v(e) {
    var s;
    var r = e.f, t = (r & xe) !== 0;
    if (t && r & Er) {
      var n = hn(
        /** @type {Derived} */
        e
      );
      return ht(
        /** @type {Derived} */
        e
      ), n;
    }
    if (D !== null) {
      Ee !== null && Ee.includes(e) && Yi();
      var i = D.deps;
      W === null && i !== null && i[le] === e ? le++ : W === null ? W = [e] : W.push(e), Te !== null && U !== null && U.f & Z && !(U.f & he) && Te.includes(e) && (_e(U, Ae), Vr(U));
    } else if (t && /** @type {Derived} */
    e.deps === null) {
      var o = (
        /** @type {Derived} */
        e
      ), a = o.parent;
      a !== null && !((s = a.deriveds) != null && s.includes(o)) && (a.deriveds ?? (a.deriveds = [])).push(o);
    }
    return t && (o = /** @type {Derived} */
    e, rr(o) && _n(o)), e.v;
  }
  function Qe(e) {
    const r = D;
    try {
      return D = null, e();
    } finally {
      D = r;
    }
  }
  var uo = ~(Ae | Je | Z);
  function _e(e, r) {
    e.f = e.f & uo | r;
  }
  function fo(e) {
    return (
      /** @type {T} */
      kn().get(e)
    );
  }
  function Ft(e, r) {
    return kn().set(e, r), r;
  }
  function kn(e) {
    return S === null && jr(), S.c ?? (S.c = new Map(vo(S) || void 0));
  }
  function vo(e) {
    let r = e.p;
    for (; r !== null; ) {
      const t = r.c;
      if (t !== null)
        return t;
      r = r.p;
    }
    return null;
  }
  function de(e, r = false, t) {
    S = {
      p: S,
      c: null,
      e: null,
      m: false,
      s: e,
      x: null,
      l: null
    }, Xe && !r && (S.l = {
      s: null,
      u: null,
      r1: [],
      r2: ye(false)
    });
  }
  function ve(e) {
    const r = S;
    if (r !== null) {
      e !== void 0 && (r.x = e);
      const a = r.e;
      if (a !== null) {
        var t = U, n = D;
        r.e = null;
        try {
          for (var i = 0; i < a.length; i++) {
            var o = a[i];
            we(o.effect), Oe(o.reaction), _t(o.fn);
          }
        } finally {
          we(t), Oe(n);
        }
      }
      S = r.p, r.m = true;
    }
    return e || /** @type {T} */
    {};
  }
  function Y(e) {
    if (!(typeof e != "object" || !e || e instanceof EventTarget)) {
      if (We in e)
        lt(e);
      else if (!Array.isArray(e))
        for (let r in e) {
          const t = e[r];
          typeof t == "object" && t && We in t && lt(t);
        }
    }
  }
  function lt(e, r = /* @__PURE__ */ new Set()) {
    if (typeof e == "object" && e !== null && // We don't want to traverse DOM elements
    !(e instanceof EventTarget) && !r.has(e)) {
      r.add(e), e instanceof Date && e.getTime();
      for (let n in e)
        try {
          lt(e[n], r);
        } catch {
        }
      const t = Ur(e);
      if (t !== Object.prototype && t !== Array.prototype && t !== Map.prototype && t !== Set.prototype && t !== Date.prototype) {
        const n = ln(t);
        for (let i in n) {
          const o = n[i].get;
          if (o)
            try {
              o.call(e);
            } catch {
            }
        }
      }
    }
  }
  function Ve(e, r = null, t) {
    if (typeof e != "object" || e === null || We in e)
      return e;
    const n = Ur(e);
    if (n !== Ni && n !== Ri)
      return e;
    var i = /* @__PURE__ */ new Map(), o = Fr(e), a = ye(0);
    o && i.set("length", ye(
      /** @type {any[]} */
      e.length
    ));
    var s;
    return new Proxy(
      /** @type {any} */
      e,
      {
        defineProperty(u, l, f) {
          (!("value" in f) || f.configurable === false || f.enumerable === false || f.writable === false) && Vi();
          var c = i.get(l);
          return c === void 0 ? (c = ye(f.value), i.set(l, c)) : O(c, Ve(f.value, s)), true;
        },
        deleteProperty(u, l) {
          var f = i.get(l);
          if (f === void 0)
            l in u && i.set(l, ye(ae));
          else {
            if (o && typeof l == "string") {
              var c = (
                /** @type {Source<number>} */
                i.get("length")
              ), d = Number(l);
              Number.isInteger(d) && d < c.v && O(c, d);
            }
            O(f, ae), qt(a);
          }
          return true;
        },
        get(u, l, f) {
          var E;
          if (l === We)
            return e;
          var c = i.get(l), d = l in u;
          if (c === void 0 && (!d || (E = $e(u, l)) != null && E.writable) && (c = ye(Ve(d ? u[l] : ae, s)), i.set(l, c)), c !== void 0) {
            var p = v(c);
            return p === ae ? void 0 : p;
          }
          return Reflect.get(u, l, f);
        },
        getOwnPropertyDescriptor(u, l) {
          var f = Reflect.getOwnPropertyDescriptor(u, l);
          if (f && "value" in f) {
            var c = i.get(l);
            c && (f.value = v(c));
          } else if (f === void 0) {
            var d = i.get(l), p = d == null ? void 0 : d.v;
            if (d !== void 0 && p !== ae)
              return {
                enumerable: true,
                configurable: true,
                value: p,
                writable: true
              };
          }
          return f;
        },
        has(u, l) {
          var p;
          if (l === We)
            return true;
          var f = i.get(l), c = f !== void 0 && f.v !== ae || Reflect.has(u, l);
          if (f !== void 0 || U !== null && (!c || (p = $e(u, l)) != null && p.writable)) {
            f === void 0 && (f = ye(c ? Ve(u[l], s) : ae), i.set(l, f));
            var d = v(f);
            if (d === ae)
              return false;
          }
          return c;
        },
        set(u, l, f, c) {
          var I;
          var d = i.get(l), p = l in u;
          if (o && l === "length")
            for (var E = f; E < /** @type {Source<number>} */
            d.v; E += 1) {
              var m = i.get(E + "");
              m !== void 0 ? O(m, ae) : E in u && (m = ye(ae), i.set(E + "", m));
            }
          d === void 0 ? (!p || (I = $e(u, l)) != null && I.writable) && (d = ye(void 0), O(d, Ve(f, s)), i.set(l, d)) : (p = d.v !== ae, O(d, Ve(f, s)));
          var P = Reflect.getOwnPropertyDescriptor(u, l);
          if (P != null && P.set && P.set.call(c, f), !p) {
            if (o && typeof l == "string") {
              var b = (
                /** @type {Source<number>} */
                i.get("length")
              ), y = Number(l);
              Number.isInteger(y) && y >= b.v && O(b, y + 1);
            }
            qt(a);
          }
          return true;
        },
        ownKeys(u) {
          v(a);
          var l = Reflect.ownKeys(u).filter((d) => {
            var p = i.get(d);
            return p === void 0 || p.v !== ae;
          });
          for (var [f, c] of i)
            c.v !== ae && !(f in u) && l.push(f);
          return l;
        },
        setPrototypeOf() {
          Gi();
        }
      }
    );
  }
  function qt(e, r = 1) {
    O(e, e.v + r);
  }
  var Ct;
  var Nn;
  var Rn;
  function po() {
    if (Ct === void 0) {
      Ct = window;
      var e = Element.prototype, r = Node.prototype;
      Nn = $e(r, "firstChild").get, Rn = $e(r, "nextSibling").get, e.__click = void 0, e.__className = "", e.__attributes = null, e.__styles = null, e.__e = void 0, Text.prototype.__t = void 0;
    }
  }
  function Gr(e = "") {
    return document.createTextNode(e);
  }
  // @__NO_SIDE_EFFECTS__
  function mr(e) {
    return Nn.call(e);
  }
  // @__NO_SIDE_EFFECTS__
  function bt(e) {
    return Rn.call(e);
  }
  function T(e, r) {
    return /* @__PURE__ */ mr(e);
  }
  function $(e, r) {
    {
      var t = (
        /** @type {DocumentFragment} */
        /* @__PURE__ */ mr(
          /** @type {Node} */
          e
        )
      );
      return t instanceof Comment && t.data === "" ? /* @__PURE__ */ bt(t) : t;
    }
  }
  function R(e, r = 1, t = false) {
    let n = e;
    for (; r--; )
      n = /** @type {TemplateNode} */
      /* @__PURE__ */ bt(n);
    return n;
  }
  var ho = false;
  function _o(e, r) {
    if (r) {
      const t = document.body;
      e.autofocus = true, Ir(() => {
        document.activeElement === t && e.focus();
      });
    }
  }
  var jt = false;
  function go() {
    jt || (jt = true, document.addEventListener(
      "reset",
      (e) => {
        Promise.resolve().then(() => {
          var r;
          if (!e.defaultPrevented)
            for (
              const t of
              /**@type {HTMLFormElement} */
              e.target.elements
            )
              (r = t.__on_r) == null || r.call(t);
        });
      },
      // In the capture phase to guarantee we get noticed of it (no possiblity of stopPropagation)
      { capture: true }
    ));
  }
  function Sn(e) {
    var r = D, t = U;
    Oe(null), we(null);
    try {
      return e();
    } finally {
      Oe(r), we(t);
    }
  }
  function mo(e, r, t, n = t) {
    e.addEventListener(r, () => Sn(t));
    const i = e.__on_r;
    i ? e.__on_r = () => {
      i(), n();
    } : e.__on_r = n, go();
  }
  var Un = /* @__PURE__ */ new Set();
  var ct = /* @__PURE__ */ new Set();
  function Ln(e, r, t, n) {
    function i(o) {
      if (n.capture || fr.call(r, o), !o.cancelBubble)
        return Sn(() => t.call(this, o));
    }
    return e.startsWith("pointer") || e.startsWith("touch") || e === "wheel" ? Ir(() => {
      r.addEventListener(e, i, n);
    }) : r.addEventListener(e, i, n), i;
  }
  function Yr(e, r, t, n, i) {
    var o = { capture: n, passive: i }, a = Ln(e, r, t, o);
    (r === document.body || r === window || r === document) && mn(() => {
      r.removeEventListener(e, a, o);
    });
  }
  function bo(e) {
    for (var r = 0; r < e.length; r++)
      Un.add(e[r]);
    for (var t of ct)
      t(e);
  }
  function fr(e) {
    var y;
    var r = this, t = (
      /** @type {Node} */
      r.ownerDocument
    ), n = e.type, i = ((y = e.composedPath) == null ? void 0 : y.call(e)) || [], o = (
      /** @type {null | Element} */
      i[0] || e.target
    ), a = 0, s = e.__root;
    if (s) {
      var u = i.indexOf(s);
      if (u !== -1 && (r === document || r === /** @type {any} */
      window)) {
        e.__root = r;
        return;
      }
      var l = i.indexOf(r);
      if (l === -1)
        return;
      u <= l && (a = u);
    }
    if (o = /** @type {Element} */
    i[a] || e.target, o !== r) {
      ki(e, "currentTarget", {
        configurable: true,
        get() {
          return o || t;
        }
      });
      var f = D, c = U;
      Oe(null), we(null);
      try {
        for (var d, p = []; o !== null; ) {
          var E = o.assignedSlot || o.parentNode || /** @type {any} */
          o.host || null;
          try {
            var m = o["__" + n];
            if (m !== void 0 && !/** @type {any} */
            o.disabled)
              if (Fr(m)) {
                var [P, ...b] = m;
                P.apply(o, [e, ...b]);
              } else
                m.call(o, e);
          } catch (I) {
            d ? p.push(I) : d = I;
          }
          if (e.cancelBubble || E === r || E === null)
            break;
          o = E;
        }
        if (d) {
          for (let I of p)
            queueMicrotask(() => {
              throw I;
            });
          throw d;
        }
      } finally {
        e.__root = r, delete e.currentTarget, Oe(f), we(c);
      }
    }
  }
  function $n(e) {
    var r = document.createElement("template");
    return r.innerHTML = e, r.content;
  }
  function Ze(e, r) {
    var t = (
      /** @type {Effect} */
      U
    );
    t.nodes_start === null && (t.nodes_start = e, t.nodes_end = r);
  }
  // @__NO_SIDE_EFFECTS__
  function w(e, r) {
    var t = (r & Pi) !== 0, n = (r & Ti) !== 0, i, o = !e.startsWith("<!>");
    return () => {
      i === void 0 && (i = $n(o ? e : "<!>" + e), t || (i = /** @type {Node} */
      /* @__PURE__ */ mr(i)));
      var a = (
        /** @type {TemplateNode} */
        n ? document.importNode(i, true) : i.cloneNode(true)
      );
      if (t) {
        var s = (
          /** @type {TemplateNode} */
          /* @__PURE__ */ mr(a)
        ), u = (
          /** @type {TemplateNode} */
          a.lastChild
        );
        Ze(s, u);
      } else
        Ze(a, a);
      return a;
    };
  }
  function Me(e = "") {
    {
      var r = Gr(e + "");
      return Ze(r, r), r;
    }
  }
  function fe() {
    var e = document.createDocumentFragment(), r = document.createComment(""), t = Gr();
    return e.append(r, t), Ze(r, t), e;
  }
  function h(e, r) {
    e !== null && e.before(
      /** @type {Node} */
      r
    );
  }
  function yo(e) {
    return e.endsWith("capture") && e !== "gotpointercapture" && e !== "lostpointercapture";
  }
  var Eo = [
    "beforeinput",
    "click",
    "change",
    "dblclick",
    "contextmenu",
    "focusin",
    "focusout",
    "input",
    "keydown",
    "keyup",
    "mousedown",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "pointerdown",
    "pointermove",
    "pointerout",
    "pointerover",
    "pointerup",
    "touchend",
    "touchmove",
    "touchstart"
  ];
  function wo(e) {
    return Eo.includes(e);
  }
  var Io = {
    // no `class: 'className'` because we handle that separately
    formnovalidate: "formNoValidate",
    ismap: "isMap",
    nomodule: "noModule",
    playsinline: "playsInline",
    readonly: "readOnly"
  };
  function xo(e) {
    return e = e.toLowerCase(), Io[e] ?? e;
  }
  var Po = ["touchstart", "touchmove"];
  function To(e) {
    return Po.includes(e);
  }
  function re(e, r) {
    var t = r == null ? "" : typeof r == "object" ? r + "" : r;
    t !== (e.__t ?? (e.__t = e.nodeValue)) && (e.__t = t, e.nodeValue = t == null ? "" : t + "");
  }
  function Ao(e, r) {
    return Oo(e, r);
  }
  var je = /* @__PURE__ */ new Map();
  function Oo(e, { target: r, anchor: t, props: n = {}, events: i, context: o, intro: a = true }) {
    po();
    var s = /* @__PURE__ */ new Set(), u = (c) => {
      for (var d = 0; d < c.length; d++) {
        var p = c[d];
        if (!s.has(p)) {
          s.add(p);
          var E = To(p);
          r.addEventListener(p, fr, { passive: E });
          var m = je.get(p);
          m === void 0 ? (document.addEventListener(p, fr, { passive: E }), je.set(p, 1)) : je.set(p, m + 1);
        }
      }
    };
    u(Oi(Un)), ct.add(u);
    var l = void 0, f = Xi(() => {
      var c = t ?? r.appendChild(Gr());
      return _r(() => {
        if (o) {
          de({});
          var d = (
            /** @type {ComponentContext} */
            S
          );
          d.c = o;
        }
        i && (n.$$events = i), l = e(c, n) || {}, o && ve();
      }), () => {
        var E;
        for (var d of s) {
          r.removeEventListener(d, fr);
          var p = (
            /** @type {number} */
            je.get(d)
          );
          --p === 0 ? (document.removeEventListener(d, fr), je.delete(d)) : je.set(d, p);
        }
        ct.delete(u), Ht.delete(l), c !== t && ((E = c.parentNode) == null || E.removeChild(c));
      };
    });
    return Ht.set(l, f), l;
  }
  var Ht = /* @__PURE__ */ new WeakMap();
  function L(e, r, t, n = null, i = false) {
    var o = e, a = null, s = null, u = null, l = i ? qr : 0;
    Cr(() => {
      u !== (u = !!r()) && (u ? (a ? it(a) : a = _r(() => t(o)), s && nt(s, () => {
        s = null;
      })) : (s ? it(s) : n && (s = _r(() => n(o))), a && nt(a, () => {
        a = null;
      })));
    }, l);
  }
  function Pr(e, r, t, n, i) {
    var o = e, a = "", s;
    Cr(() => {
      a !== (a = r() ?? "") && (s !== void 0 && (ke(s), s = void 0), a !== "" && (s = _r(() => {
        var u = a + "", l = $n(u);
        Ze(
          /** @type {TemplateNode} */
          /* @__PURE__ */ mr(l),
          /** @type {TemplateNode} */
          l.lastChild
        ), o.before(l);
      })));
    });
  }
  function G(e, r, t, n, i) {
    var s;
    var o = (s = r.$$slots) == null ? void 0 : s[t], a = false;
    o === true && (o = r[t === "default" ? "children" : t], a = true), o === void 0 || o(e, a ? () => n : n);
  }
  function ko(e, r, t, n, i, o) {
    var a, s, u = null, l = (
      /** @type {TemplateNode} */
      e
    ), f;
    Cr(() => {
      const c = r() || null;
      var d = c === "svg" ? sn : null;
      c !== a && (f && (c === null ? nt(f, () => {
        f = null, s = null;
      }) : c === s ? it(f) : ke(f)), c && c !== s && (f = _r(() => {
        if (u = d ? document.createElementNS(d, c) : document.createElement(c), Ze(u, u), n) {
          var p = (
            /** @type {TemplateNode} */
            u.appendChild(Gr())
          );
          n(u, p);
        }
        U.nodes_end = u, l.before(u);
      })), a = c, a && (s = a));
    }, qr);
  }
  function M(e, r) {
    Ir(() => {
      var t = e.getRootNode(), n = (
        /** @type {ShadowRoot} */
        t.host ? (
          /** @type {ShadowRoot} */
          t
        ) : (
          /** @type {Document} */
          t.head ?? /** @type {Document} */
          t.ownerDocument.head
        )
      );
      if (!n.querySelector("#" + r.hash)) {
        const i = document.createElement("style");
        i.id = r.hash, i.textContent = r.code, n.appendChild(i);
      }
    });
  }
  function te(e, r, t, n) {
    var i = e.__attributes ?? (e.__attributes = {});
    i[r] !== (i[r] = t) && (r === "style" && "__styles" in e && (e.__styles = {}), r === "loading" && (e[Di] = t), t == null ? e.removeAttribute(r) : typeof t != "string" && Dn(e).includes(r) ? e[r] = t : e.setAttribute(r, t));
  }
  function No(e, r, t, n, i = false, o = false, a = false) {
    var s = {}, u = e.tagName === "OPTION";
    for (var l in r)
      l in t || (t[l] = null);
    t.class = t.class ? t.class + " " + n : n;
    var f = Dn(e), c = (
      /** @type {Record<string, unknown>} **/
      e.__attributes ?? (e.__attributes = {})
    ), d = [];
    for (const b in t) {
      let y = t[b];
      if (u && b === "value" && y == null) {
        e.value = e.__value = "", s[b] = y;
        continue;
      }
      var p = s[b];
      if (y !== p) {
        s[b] = y;
        var E = b[0] + b[1];
        if (E !== "$$") {
          if (E === "on") {
            const I = {}, _ = "$$" + b;
            let x = b.slice(2);
            var m = wo(x);
            if (yo(x) && (x = x.slice(0, -7), I.capture = true), !m && p) {
              if (y != null) continue;
              e.removeEventListener(x, s[_], I), s[_] = null;
            }
            if (y != null)
              if (m)
                e[`__${x}`] = y, bo([x]);
              else {
                let q = function(k) {
                  s[b].call(this, k);
                };
                d.push([
                  b,
                  y,
                  () => s[_] = Ln(x, e, q, I)
                ]);
              }
          } else if (b === "style" && y != null)
            e.style.cssText = y + "";
          else if (b === "autofocus")
            _o(
              /** @type {HTMLElement} */
              e,
              !!y
            );
          else if (b === "__value" || b === "value" && y != null)
            e.value = e[b] = e.__value = y;
          else {
            var P = b;
            i || (P = xo(P)), y == null && !o ? (c[b] = null, e.removeAttribute(b)) : f.includes(P) && (o || typeof y != "string") ? e[P] = y : typeof y != "function" && te(e, P, y);
          }
          b === "style" && "__styles" in e && (e.__styles = {});
        }
      }
    }
    return Ir(() => {
      if (e.isConnected)
        for (const [b, y, I] of d)
          s[b] === y && I();
    }), s;
  }
  var Vt = /* @__PURE__ */ new Map();
  function Dn(e) {
    var r = Vt.get(e.nodeName);
    if (r) return r;
    Vt.set(e.nodeName, r = []);
    for (var t, n = Ur(e), i = Element.prototype; i !== n; ) {
      t = ln(n);
      for (var o in t)
        t[o].set && r.push(o);
      n = Ur(n);
    }
    return r;
  }
  function Mn(e, r) {
    var t = e.__className, n = Ro(r);
    (t !== n || ho) && (r == null ? e.removeAttribute("class") : e.className = n, e.__className = n);
  }
  function Ro(e) {
    return e ?? "";
  }
  function So(e, r, t = r) {
    var n = Hr();
    mo(e, "input", () => {
      var i = Gt(e) ? Yt(e.value) : e.value;
      t(i), n && i !== (i = r()) && (e.value = i ?? "");
    }), wr(() => {
      var i = r();
      Gt(e) && i === Yt(e.value) || e.type === "date" && !i && !e.value || i !== e.value && (e.value = i ?? "");
    });
  }
  function Gt(e) {
    var r = e.type;
    return r === "number" || r === "range";
  }
  function Yt(e) {
    return e === "" ? null : +e;
  }
  function Or(e, r, t) {
    var n = $e(e, r);
    n && n.set && (e[r] = t, mn(() => {
      e[r] = null;
    }));
  }
  function Wt(e, r) {
    return e === r || (e == null ? void 0 : e[We]) === r;
  }
  function Uo(e = {}, r, t, n) {
    return _t(() => {
      var i, o;
      return wr(() => {
        i = o, o = [], Qe(() => {
          e !== t(...o) && (r(e, ...o), i && Wt(t(...i), e) && r(null, ...i));
        });
      }), () => {
        Ir(() => {
          o && Wt(t(...o), e) && r(null, ...o);
        });
      };
    }), e;
  }
  function Bn(e) {
    return function(...r) {
      var t = (
        /** @type {Event} */
        r[0]
      );
      return t.preventDefault(), e == null ? void 0 : e.apply(this, r);
    };
  }
  function ge(e = false) {
    const r = (
      /** @type {ComponentContextLegacy} */
      S
    ), t = r.l.u;
    if (!t) return;
    let n = () => Y(r.s);
    if (e) {
      let i = 0, o = (
        /** @type {Record<string, any>} */
        {}
      );
      const a = /* @__PURE__ */ $r(() => {
        let s = false;
        const u = r.s;
        for (const l in u)
          u[l] !== o[l] && (o[l] = u[l], s = true);
        return s && i++, i;
      });
      n = () => v(a);
    }
    t.b.length && Zi(() => {
      zt(r, n), rt(t.b);
    }), tt(() => {
      const i = Qe(() => t.m.map(Si));
      return () => {
        for (const o of i)
          typeof o == "function" && o();
      };
    }), t.a.length && tt(() => {
      zt(r, n), rt(t.a);
    });
  }
  function zt(e, r) {
    if (e.l.s)
      for (const t of e.l.s) v(t);
    r();
  }
  function Fn(e, r) {
    var o;
    var t = (
      /** @type {Record<string, Function[] | Function>} */
      (o = e.$$events) == null ? void 0 : o[r.type]
    ), n = Fr(t) ? t.slice() : t == null ? [] : [t];
    for (var i of n)
      i.call(this, r);
  }
  function Wr(e) {
    S === null && jr(), Xe && S.l !== null ? qn(S).m.push(e) : tt(() => {
      const r = Qe(e);
      if (typeof r == "function") return (
        /** @type {() => void} */
        r
      );
    });
  }
  function Lo(e, r, { bubbles: t = false, cancelable: n = false } = {}) {
    return new CustomEvent(e, { detail: r, bubbles: t, cancelable: n });
  }
  function $o() {
    const e = S;
    return e === null && jr(), (r, t, n) => {
      var o;
      const i = (
        /** @type {Record<string, Function | Function[]>} */
        (o = e.s.$$events) == null ? void 0 : o[
          /** @type {any} */
          r
        ]
      );
      if (i) {
        const a = Fr(i) ? i.slice() : [i], s = Lo(
          /** @type {string} */
          r,
          t,
          n
        );
        for (const u of a)
          u.call(e.x, s);
        return !s.defaultPrevented;
      }
      return true;
    };
  }
  function Do(e) {
    S === null && jr(), S.l === null && ji(), qn(S).b.push(e);
  }
  function qn(e) {
    var r = (
      /** @type {ComponentContextLegacy} */
      e.l
    );
    return r.u ?? (r.u = { a: [], b: [], m: [] });
  }
  var kr = false;
  function Mo(e) {
    var r = kr;
    try {
      return kr = false, [e(), kr];
    } finally {
      kr = r;
    }
  }
  function Kt(e) {
    for (var r = U, t = U; r !== null && !(r.f & (he | yr)); )
      r = r.parent;
    try {
      return we(r), e();
    } finally {
      we(t);
    }
  }
  function g(e, r, t, n) {
    var q;
    var i = (t & yi) !== 0, o = !Xe || (t & Ei) !== 0, a = (t & Ii) !== 0, s = (t & xi) !== 0, u = false, l;
    a ? [l, u] = Mo(() => (
      /** @type {V} */
      e[r]
    )) : l = /** @type {V} */
    e[r];
    var f = (q = $e(e, r)) == null ? void 0 : q.set, c = (
      /** @type {V} */
      n
    ), d = true, p = false, E = () => (p = true, d && (d = false, s ? c = Qe(
      /** @type {() => V} */
      n
    ) : c = /** @type {V} */
    n), c);
    l === void 0 && n !== void 0 && (f && o && Hi(), l = E(), f && f(l));
    var m;
    if (o)
      m = () => {
        var k = (
          /** @type {V} */
          e[r]
        );
        return k === void 0 ? E() : (d = true, p = false, k);
      };
    else {
      var P = Kt(
        () => (i ? $r : ce)(() => (
          /** @type {V} */
          e[r]
        ))
      );
      P.f |= Li, m = () => {
        var k = v(P);
        return k !== void 0 && (c = /** @type {V} */
        void 0), k === void 0 ? c : k;
      };
    }
    if (!(t & wi))
      return m;
    if (f) {
      var b = e.$$legacy;
      return function(k, B) {
        return arguments.length > 0 ? ((!o || !B || b || u) && f(B ? m() : k), k) : m();
      };
    }
    var y = false, I = false, _ = /* @__PURE__ */ dn(l), x = Kt(
      () => /* @__PURE__ */ $r(() => {
        var k = m(), B = v(_);
        return y ? (y = false, I = true, B) : (I = false, _.v = k);
      })
    );
    return i || (x.equals = pt), function(k, B) {
      if (arguments.length > 0) {
        const V = B ? v(x) : o && a ? Ve(k) : k;
        return x.equals(V) || (y = true, O(_, V), p && c !== void 0 && (c = V), Qe(() => v(x))), k;
      }
      return v(x);
    };
  }
  var Bo = {
    hash: "svelte-1bzqb13",
    code: ".rcb-modal-section.svelte-1bzqb13 {padding:8px 0px;display:flex;}section.rcb-modal-section.svelte-1bzqb13 {flex-grow:1;}.rcb-modal-section.svelte-1bzqb13:last-of-type {padding:0;}"
  };
  function tr(e, r) {
    M(e, Bo);
    let t = g(r, "as", 8, "section");
    var n = fe(), i = $(n);
    ko(i, t, false, (o, a) => {
      No(o, null, { class: "rcb-modal-section" }, "svelte-1bzqb13", o.namespaceURI === sn, o.nodeName.includes("-"));
      var s = fe(), u = $(s);
      G(u, r, "default", {}), h(a, s);
    }), h(e, n);
  }
  var se = /* @__PURE__ */ ((e) => (e[e.Silent = 0] = "Silent", e[e.Error = 1] = "Error", e[e.Warn = 2] = "Warn", e[e.Info = 3] = "Info", e[e.Debug = 4] = "Debug", e[e.Verbose = 5] = "Verbose", e))(se || {});
  var F = class {
    static setLogLevel(r) {
      this.logLevel = r;
    }
    static log(r, t = this.logLevel) {
      const n = `[Purchases] ${r}`;
      if (!(this.logLevel < t || t === se.Silent))
        switch (t) {
          case se.Error:
            console.error(n);
            break;
          case se.Warn:
            console.warn(n);
            break;
          case se.Info:
            console.info(n);
            break;
          case se.Debug:
            console.debug(n);
            break;
          case se.Verbose:
            console.debug(n);
            break;
        }
    }
    static errorLog(r) {
      this.log(r, se.Error);
    }
    static warnLog(r) {
      this.log(r, se.Warn);
    }
    static infoLog(r) {
      this.log(r, se.Info);
    }
    static debugLog(r) {
      this.log(r, se.Debug);
    }
    static verboseLog(r) {
      this.log(r, se.Verbose);
    }
  };
  N(F, "logLevel", se.Silent);
  var Ie = /* @__PURE__ */ ((e) => (e.Year = "year", e.Month = "month", e.Week = "week", e.Day = "day", e))(Ie || {});
  function yt(e) {
    const r = e.match(/^PT?([0-9]+)([MDYW])$/);
    if (!r || r.length < 3)
      return F.errorLog(`Invalid ISO 8601 duration format: ${e}`), null;
    const t = parseInt(r[1]);
    switch (r[2]) {
      case "Y":
        return {
          number: t,
          unit: "year"
          /* Year */
        };
      case "M":
        return {
          number: t,
          unit: "month"
          /* Month */
        };
      case "W":
        return {
          number: t,
          unit: "week"
          /* Week */
        };
      case "D":
        return {
          number: t,
          unit: "day"
          /* Day */
        };
      default:
        return F.errorLog(`Invalid ISO 8601 unit duration format: ${e}`), null;
    }
  }
  var Fo = (e, r, t) => {
    const n = e / 1e6;
    return new Intl.NumberFormat(t, {
      style: "currency",
      currency: r
    }).format(n);
  };
  var qo = (e) => {
    const r = e.number;
    if (r === 1)
      switch (e.unit) {
        case Ie.Year:
          return "yearly";
        case Ie.Month:
          return "monthly";
        case Ie.Week:
          return "weekly";
        case Ie.Day:
          return "daily";
      }
    else
      return `every ${r} ${e.unit}s`;
  };
  var Co = (e) => {
    const r = e.number;
    if (r === 1)
      switch (e.unit) {
        case Ie.Year:
          return "1 year";
        case Ie.Month:
          return "1 month";
        case Ie.Week:
          return "1 week";
        case Ie.Day:
          return "1 day";
      }
    else
      return `${r} ${e.unit}s`;
  };
  var jo = (e) => {
    const r = yt(e);
    return r ? qo(r) : "unknown";
  };
  var Ho = (e) => {
    const r = yt(e);
    return r ? Co(r) : "unknown";
  };
  function Vo(e) {
    return e != null;
  }
  var Tr = /* @__PURE__ */ ((e) => (e.Subscription = "subscription", e.Consumable = "consumable", e.NonConsumable = "non_consumable", e))(Tr || {});
  var Cn = (e) => ({
    amount: e.amount_micros / 1e4,
    amountMicros: e.amount_micros,
    currency: e.currency,
    formattedPrice: Fo(e.amount_micros, e.currency)
  });
  var Qt = (e) => {
    const r = e.period_duration;
    return {
      periodDuration: r,
      period: r ? yt(r) : null,
      cycleCount: e.cycle_count,
      price: e.price ? Cn(e.price) : null
    };
  };
  var Yo = (e) => e.base == null ? (F.debugLog("Missing base phase for subscription option. Ignoring."), null) : {
    id: e.id,
    priceId: e.price_id,
    base: Qt(e.base),
    trial: e.trial ? Qt(e.trial) : null
  };
  var Wo = (e) => e.base_price == null ? (F.debugLog(
    "Missing base price for non-subscription option. Ignoring."
  ), null) : {
    id: e.id,
    priceId: e.price_id,
    basePrice: Cn(e.base_price)
  };
  var zo = (e, r) => {
    const t = e.product_type;
    return t === "subscription" ? Qo(
      e,
      r,
      t
    ) : Ko(
      e,
      r,
      t
    );
  };
  var Ko = (e, r, t) => {
    const n = {};
    if (Object.entries(e.purchase_options).forEach(
      ([a, s]) => {
        const u = Wo(
          s
        );
        u != null && (n[a] = u);
      }
    ), Object.keys(n).length === 0)
      return F.debugLog(
        `Product ${e.identifier} has no purchase options. Ignoring.`
      ), null;
    const i = e.default_purchase_option_id, o = i && i in e.purchase_options ? n[i] : null;
    return o == null ? (F.debugLog(
      `Product ${e.identifier} has no default purchase option. Ignoring.`
    ), null) : {
      identifier: e.identifier,
      displayName: e.title,
      title: e.title,
      description: e.description,
      productType: t,
      currentPrice: o.basePrice,
      normalPeriodDuration: null,
      presentedOfferingIdentifier: r.offeringIdentifier,
      presentedOfferingContext: r,
      defaultPurchaseOption: o,
      defaultSubscriptionOption: null,
      subscriptionOptions: {},
      defaultNonSubscriptionOption: o
    };
  };
  var Qo = (e, r, t) => {
    const n = {};
    if (Object.entries(e.purchase_options).forEach(
      ([s, u]) => {
        const l = Yo(u);
        l != null && (n[s] = l);
      }
    ), Object.keys(n).length === 0)
      return F.debugLog(
        `Product ${e.identifier} has no subscription options. Ignoring.`
      ), null;
    const i = e.default_purchase_option_id, o = i && i in n ? n[i] : null;
    if (o == null)
      return F.debugLog(
        `Product ${e.identifier} has no default subscription option. Ignoring.`
      ), null;
    const a = o.base.price;
    return a == null ? (F.debugLog(
      `Product ${e.identifier} default option has no base price. Ignoring.`
    ), null) : {
      identifier: e.identifier,
      displayName: e.title,
      title: e.title,
      description: e.description,
      productType: t,
      currentPrice: a,
      normalPeriodDuration: o.base.periodDuration,
      presentedOfferingIdentifier: r.offeringIdentifier,
      presentedOfferingContext: r,
      defaultPurchaseOption: o,
      defaultSubscriptionOption: o,
      subscriptionOptions: n,
      defaultNonSubscriptionOption: null
    };
  };
  var Zo = (e, r, t) => {
    const n = t[r.platform_product_identifier];
    if (n === void 0) return null;
    const i = zo(n, e);
    return i === null ? null : {
      identifier: r.identifier,
      rcBillingProduct: i,
      packageType: Jo(r.identifier)
    };
  };
  var Xo = (e, r, t, n) => {
    const i = {
      offeringIdentifier: r.identifier,
      targetingContext: e && n ? {
        ruleId: n.rule_id,
        revision: n.revision
      } : null,
      placementIdentifier: null
    }, o = r.packages.map(
      (s) => Zo(i, s, t)
    ).filter(Vo), a = {};
    for (const s of o)
      s != null && (a[s.identifier] = s);
    return o.length == 0 ? null : {
      identifier: r.identifier,
      serverDescription: r.description,
      metadata: r.metadata,
      packagesById: a,
      availablePackages: o,
      lifetime: a.$rc_lifetime ?? null,
      annual: a.$rc_annual ?? null,
      sixMonth: a.$rc_six_month ?? null,
      threeMonth: a.$rc_three_month ?? null,
      twoMonth: a.$rc_two_month ?? null,
      monthly: a.$rc_monthly ?? null,
      weekly: a.$rc_weekly ?? null
    };
  };
  function Jo(e) {
    switch (e) {
      case "$rc_lifetime":
        return "$rc_lifetime";
      case "$rc_annual":
        return "$rc_annual";
      case "$rc_six_month":
        return "$rc_six_month";
      case "$rc_three_month":
        return "$rc_three_month";
      case "$rc_two_month":
        return "$rc_two_month";
      case "$rc_monthly":
        return "$rc_monthly";
      case "$rc_weekly":
        return "$rc_weekly";
      default:
        return e.startsWith("$rc_") ? "unknown" : "custom";
    }
  }
  var ea = /* @__PURE__ */ w('<span class="rcb-product-price-after-trial svelte-1mdrqnh"> </span>');
  var ra = /* @__PURE__ */ w('<span class="rcb-product-description svelte-1mdrqnh"> </span>');
  var ta = /* @__PURE__ */ w("<li> </li>");
  var na = /* @__PURE__ */ w('<span class="rcb-product-price svelte-1mdrqnh"><!> <!></span> <!> <!> <ul class="rcb-product-details svelte-1mdrqnh"><!> <li>Continues until canceled</li> <li>Cancel anytime</li></ul>', 1);
  var ia = /* @__PURE__ */ w('<span class="rcb-product-description svelte-1mdrqnh"> </span>');
  var oa = /* @__PURE__ */ w('<span class="rcb-product-price svelte-1mdrqnh"> </span> <!>', 1);
  var aa = /* @__PURE__ */ w('<div class="rcb-pricing-info svelte-1mdrqnh"><span class="rc-product-title"> </span> <!> <!></div>');
  var sa = {
    hash: "svelte-1mdrqnh",
    code: `.rcb-pricing-info.svelte-1mdrqnh {display:flex;flex-direction:column;margin-top:102px;font-weight:500;}.rcb-product-price.svelte-1mdrqnh {color:var(--rc-color-grey-text-dark);font-size:24px;margin:12px 0px;}.rcb-product-description.svelte-1mdrqnh {color:var(--rc-color-grey-text-dark);margin:0 0 12px 0;}.rcb-product-price-after-trial.svelte-1mdrqnh {margin-bottom:12px;}.rcb-product-details.svelte-1mdrqnh {color:var(--rc-color-grey-text-light);list-style-type:disc;list-style-position:inside;margin:0px;padding:0px;}

    @media screen and (max-width: 960px) {.rcb-pricing-info.svelte-1mdrqnh {margin-top:48px;}
    }`
  };
  function Zt(e, r) {
    var c;
    de(r, false), M(e, sa);
    let t = g(r, "productDetails", 8), n = g(r, "purchaseOption", 8), i = g(r, "brandingAppearance", 8, void 0);
    const o = t().productType === Tr.Subscription, a = n(), s = n(), u = a == null ? void 0 : a.trial, l = (c = a == null ? void 0 : a.base) == null ? void 0 : c.price, f = s == null ? void 0 : s.basePrice;
    ge(), tr(e, {
      children: (d, p) => {
        var E = aa(), m = T(E), P = T(m), b = R(m, 2);
        L(b, () => o, (I) => {
          var _ = na(), x = $(_), q = T(x);
          L(q, () => u == null ? void 0 : u.periodDuration, (A) => {
            var j = Me();
            C(() => re(j, `${Ho(u.periodDuration) ?? ""} free trial`)), h(A, j);
          });
          var k = R(q, 2);
          L(k, () => !(u != null && u.periodDuration) && l, (A) => {
            var j = Me();
            C(() => re(j, l.formattedPrice)), h(A, j);
          });
          var B = R(x, 2);
          L(B, () => u && l, (A) => {
            var j = ea(), ie = T(j);
            C(() => re(ie, u && l && `${l.formattedPrice} after end of trial`)), h(A, j);
          });
          var V = R(B, 2);
          L(V, () => {
            var A;
            return ((A = i()) == null ? void 0 : A.show_product_description) && t().description;
          }, (A) => {
            var j = ra(), ie = T(j);
            C(() => re(ie, t().description)), h(A, j);
          });
          var ne = R(V, 2), Ne = T(ne);
          L(Ne, () => t().normalPeriodDuration, (A) => {
            var j = ta(), ie = T(j);
            C(() => re(ie, `Renews ${jo(t().normalPeriodDuration) ?? ""}`)), h(A, j);
          }), h(I, _);
        });
        var y = R(b, 2);
        L(y, () => !o, (I) => {
          var _ = oa(), x = $(_), q = T(x), k = R(x, 2);
          L(k, () => {
            var B;
            return (B = i()) == null ? void 0 : B.show_product_description;
          }, (B) => {
            var V = ia(), ne = T(V);
            C(() => re(ne, t().description)), h(B, V);
          }), C(() => re(q, f == null ? void 0 : f.formattedPrice)), h(I, _);
        }), C(() => re(P, t().title)), h(d, E);
      },
      $$slots: { default: true }
    }), ve();
  }
  var la = '<svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" transform="rotate(0 0 0)"><path d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 11.5858 20.8358 11.25 21.25 11.25C21.6642 11.25 22 11.5858 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C12.4142 2 12.75 2.33579 12.75 2.75C12.75 3.16421 12.4142 3.5 12 3.5Z" fill="currentColor"/></svg>';
  var ca = /* @__PURE__ */ w('<div style="color:var(--rc-color-accent);" class="rcb-ui-asset-icon svelte-16h2a8k"><!></div>');
  var ua = {
    hash: "svelte-16h2a8k",
    code: `
    @-webkit-keyframes svelte-16h2a8k-rotating /* Safari and Chrome */ {
        from {
            -webkit-transform: rotate(0deg);
            -o-transform: rotate(0deg);
            transform: rotate(0deg);
        }
        to {
            -webkit-transform: rotate(360deg);
            -o-transform: rotate(360deg);
            transform: rotate(360deg);
        }
    }
    @keyframes svelte-16h2a8k-rotating {
        from {
            -ms-transform: rotate(0deg);
            -moz-transform: rotate(0deg);
            -webkit-transform: rotate(0deg);
            -o-transform: rotate(0deg);
            transform: rotate(0deg);
        }
        to {
            -ms-transform: rotate(360deg);
            -moz-transform: rotate(360deg);
            -webkit-transform: rotate(360deg);
            -o-transform: rotate(360deg);
            transform: rotate(360deg);
        }
    }div.svelte-16h2a8k {width:80px;height:80px;
        -webkit-animation: svelte-16h2a8k-rotating 2s ease-in-out infinite;
        -moz-animation: svelte-16h2a8k-rotating 2s ease-in-out infinite;
        -ms-animation: svelte-16h2a8k-rotating 2s ease-in-out infinite;
        -o-animation: svelte-16h2a8k-rotating 2s ease-in-out infinite;
        animation: svelte-16h2a8k-rotating 2s ease-in-out infinite;}`
  };
  function fa(e) {
    M(e, ua);
    var r = ca(), t = T(r);
    Pr(t, () => la), h(e, r);
  }
  var da = /* @__PURE__ */ w('<div class="rcb-modal-loader svelte-l57ojl"><!></div>');
  var va = {
    hash: "svelte-l57ojl",
    code: ".rcb-modal-loader.svelte-l57ojl {width:100%;flex-grow:1;min-height:100%;display:flex;justify-content:center;align-items:center;}"
  };
  function ut(e) {
    M(e, va);
    var r = da(), t = T(r);
    fa(t), h(e, r);
  }
  var Q = /* @__PURE__ */ ((e) => (e[e.UnknownError = 0] = "UnknownError", e[e.UserCancelledError = 1] = "UserCancelledError", e[e.StoreProblemError = 2] = "StoreProblemError", e[e.PurchaseNotAllowedError = 3] = "PurchaseNotAllowedError", e[e.PurchaseInvalidError = 4] = "PurchaseInvalidError", e[e.ProductNotAvailableForPurchaseError = 5] = "ProductNotAvailableForPurchaseError", e[e.ProductAlreadyPurchasedError = 6] = "ProductAlreadyPurchasedError", e[e.ReceiptAlreadyInUseError = 7] = "ReceiptAlreadyInUseError", e[e.InvalidReceiptError = 8] = "InvalidReceiptError", e[e.MissingReceiptFileError = 9] = "MissingReceiptFileError", e[e.NetworkError = 10] = "NetworkError", e[e.InvalidCredentialsError = 11] = "InvalidCredentialsError", e[e.UnexpectedBackendResponseError = 12] = "UnexpectedBackendResponseError", e[e.InvalidAppUserIdError = 14] = "InvalidAppUserIdError", e[e.OperationAlreadyInProgressError = 15] = "OperationAlreadyInProgressError", e[e.UnknownBackendError = 16] = "UnknownBackendError", e[e.InvalidAppleSubscriptionKeyError = 17] = "InvalidAppleSubscriptionKeyError", e[e.IneligibleError = 18] = "IneligibleError", e[e.InsufficientPermissionsError = 19] = "InsufficientPermissionsError", e[e.PaymentPendingError = 20] = "PaymentPendingError", e[e.InvalidSubscriberAttributesError = 21] = "InvalidSubscriberAttributesError", e[e.LogOutWithAnonymousUserError = 22] = "LogOutWithAnonymousUserError", e[e.ConfigurationError = 23] = "ConfigurationError", e[e.UnsupportedError = 24] = "UnsupportedError", e[e.EmptySubscriberAttributesError = 25] = "EmptySubscriberAttributesError", e[e.CustomerInfoError = 28] = "CustomerInfoError", e[e.SignatureVerificationError = 36] = "SignatureVerificationError", e[e.InvalidEmailError = 38] = "InvalidEmailError", e))(Q || {});
  var pr = class {
    static getPublicMessage(r) {
      switch (r) {
        case 0:
          return "Unknown error.";
        case 1:
          return "Purchase was cancelled.";
        case 2:
          return "There was a problem with the store.";
        case 3:
          return "The device or user is not allowed to make the purchase.";
        case 4:
          return "One or more of the arguments provided are invalid.";
        case 5:
          return "The product is not available for purchase.";
        case 6:
          return "This product is already active for the user.";
        case 7:
          return "There is already another active subscriber using the same receipt.";
        case 8:
          return "The receipt is not valid.";
        case 9:
          return "The receipt is missing.";
        case 10:
          return "Error performing request. Please check your network connection and try again.";
        case 11:
          return "There was a credentials issue. Check the underlying error for more details.";
        case 12:
          return "Received unexpected response from the backend.";
        case 14:
          return "The app user id is not valid.";
        case 15:
          return "The operation is already in progress.";
        case 16:
          return "There was an unknown backend error.";
        case 17:
          return "Apple Subscription Key is invalid or not present. In order to provide subscription offers, you must first generate a subscription key. Please see https://docs.revenuecat.com/docs/ios-subscription-offers for more info.";
        case 18:
          return "The User is ineligible for that action.";
        case 19:
          return "App does not have sufficient permissions to make purchases.";
        case 20:
          return "The payment is pending.";
        case 21:
          return "One or more of the attributes sent could not be saved.";
        case 22:
          return "Called logOut but the current user is anonymous.";
        case 23:
          return "There is an issue with your configuration. Check the underlying error for more details.";
        case 24:
          return "There was a problem with the operation. Looks like we doesn't support that yet. Check the underlying error for more details.";
        case 25:
          return "A request for subscriber attributes returned none.";
        case 28:
          return "There was a problem related to the customer info.";
        case 36:
          return "Request failed signature verification. Please see https://rev.cat/trusted-entitlements for more info.";
        case 38:
          return "Email is not valid. Please provide a valid email address.";
      }
    }
    static getErrorCodeForBackendErrorCode(r) {
      switch (r) {
        case 7101:
        case 7773:
          return 2;
        case 7102:
          return 7;
        case 7103:
          return 8;
        case 7107:
        case 7224:
        case 7225:
          return 11;
        case 7105:
        case 7106:
        case 7814:
          return 4;
        case 7772:
          return 6;
        case 7220:
          return 14;
        case 7229:
          return 2;
        case 7230:
        case 7e3:
          return 23;
        case 7231:
          return 2;
        case 7232:
          return 18;
        case 7263:
        case 7264:
          return 21;
        case 7104:
        case 7234:
        case 7226:
        case 7110:
          return 12;
        case 7662:
          return 24;
        case 7012:
        case 7834:
          return 38;
      }
    }
    static convertCodeToBackendErrorCode(r) {
      return r in jn ? r : null;
    }
    static convertPurchaseFlowErrorCodeToErrorCode(r) {
      switch (r) {
        case K.ErrorSettingUpPurchase:
          return 2;
        case K.ErrorChargingPayment:
          return 20;
        case K.NetworkError:
          return 10;
        case K.MissingEmailError:
          return 4;
        case K.StripeError:
          return 2;
        case K.UnknownError:
          return 0;
        case K.AlreadyPurchasedError:
          return 6;
      }
    }
  };
  var jn = /* @__PURE__ */ ((e) => (e[e.BackendInvalidPlatform = 7e3] = "BackendInvalidPlatform", e[e.BackendInvalidEmail = 7012] = "BackendInvalidEmail", e[e.BackendStoreProblem = 7101] = "BackendStoreProblem", e[e.BackendCannotTransferPurchase = 7102] = "BackendCannotTransferPurchase", e[e.BackendInvalidReceiptToken = 7103] = "BackendInvalidReceiptToken", e[e.BackendInvalidAppStoreSharedSecret = 7104] = "BackendInvalidAppStoreSharedSecret", e[e.BackendInvalidPaymentModeOrIntroPriceNotProvided = 7105] = "BackendInvalidPaymentModeOrIntroPriceNotProvided", e[e.BackendProductIdForGoogleReceiptNotProvided = 7106] = "BackendProductIdForGoogleReceiptNotProvided", e[e.BackendInvalidPlayStoreCredentials = 7107] = "BackendInvalidPlayStoreCredentials", e[e.BackendInternalServerError = 7110] = "BackendInternalServerError", e[e.BackendEmptyAppUserId = 7220] = "BackendEmptyAppUserId", e[e.BackendInvalidAuthToken = 7224] = "BackendInvalidAuthToken", e[e.BackendInvalidAPIKey = 7225] = "BackendInvalidAPIKey", e[e.BackendBadRequest = 7226] = "BackendBadRequest", e[e.BackendPlayStoreQuotaExceeded = 7229] = "BackendPlayStoreQuotaExceeded", e[e.BackendPlayStoreInvalidPackageName = 7230] = "BackendPlayStoreInvalidPackageName", e[e.BackendPlayStoreGenericError = 7231] = "BackendPlayStoreGenericError", e[e.BackendUserIneligibleForPromoOffer = 7232] = "BackendUserIneligibleForPromoOffer", e[e.BackendInvalidAppleSubscriptionKey = 7234] = "BackendInvalidAppleSubscriptionKey", e[e.BackendInvalidSubscriberAttributes = 7263] = "BackendInvalidSubscriberAttributes", e[e.BackendInvalidSubscriberAttributesBody = 7264] = "BackendInvalidSubscriberAttributesBody", e[e.BackendProductIDsMalformed = 7662] = "BackendProductIDsMalformed", e[e.BackendAlreadySubscribedError = 7772] = "BackendAlreadySubscribedError", e[e.BackendPaymentGatewayGenericError = 7773] = "BackendPaymentGatewayGenericError", e[e.BackendOfferNotFound = 7814] = "BackendOfferNotFound", e[e.BackendNoMXRecordsFound = 7834] = "BackendNoMXRecordsFound", e))(jn || {});
  var z = class _z extends Error {
    constructor(t, n, i, o) {
      super(n);
      N(this, "toString", () => `PurchasesError(code: ${Q[this.errorCode]}, message: ${this.message})`);
      this.errorCode = t, this.underlyingErrorMessage = i, this.extra = o;
    }
    /** @internal */
    static getForBackendError(t, n) {
      const i = pr.getErrorCodeForBackendErrorCode(t);
      return new _z(
        i,
        pr.getPublicMessage(i),
        n,
        { backendErrorCode: t }
      );
    }
    /** @internal */
    static getForPurchasesFlowError(t) {
      return new _z(
        pr.convertPurchaseFlowErrorCodeToErrorCode(
          t.errorCode
        ),
        t.message,
        t.underlyingErrorMessage
      );
    }
  };
  var pa = class extends Error {
    constructor() {
      super("Purchases must be configured before calling getInstance");
    }
  };
  var dr = /* @__PURE__ */ ((e) => (e.Started = "started", e.InProgress = "in_progress", e.Succeeded = "succeeded", e.Failed = "failed", e))(dr || {});
  var Ge = /* @__PURE__ */ ((e) => (e[e.SetupIntentCreationFailed = 1] = "SetupIntentCreationFailed", e[e.PaymentMethodCreationFailed = 2] = "PaymentMethodCreationFailed", e[e.PaymentChargeFailed = 3] = "PaymentChargeFailed", e[e.SetupIntentCompletionFailed = 4] = "SetupIntentCompletionFailed", e[e.AlreadyPurchased = 5] = "AlreadyPurchased", e))(Ge || {});
  function ha(e) {
    var r;
    return e.operation.redemption_info ? {
      redeemUrl: ((r = e.operation.redemption_info) == null ? void 0 : r.redeem_url) ?? null
    } : null;
  }
  var K = /* @__PURE__ */ ((e) => (e[e.ErrorSettingUpPurchase = 0] = "ErrorSettingUpPurchase", e[e.ErrorChargingPayment = 1] = "ErrorChargingPayment", e[e.UnknownError = 2] = "UnknownError", e[e.NetworkError = 3] = "NetworkError", e[e.StripeError = 4] = "StripeError", e[e.MissingEmailError = 5] = "MissingEmailError", e[e.AlreadyPurchasedError = 6] = "AlreadyPurchasedError", e))(K || {});
  var H = class _H extends Error {
    constructor(r, t, n, i, o) {
      super(t), this.errorCode = r, this.underlyingErrorMessage = n, this.purchasesErrorCode = i, this.extra = o;
    }
    isRecoverable() {
      switch (this.errorCode) {
        case 3:
        case 5:
          return true;
        case 0:
        case 1:
        case 6:
        case 4:
        case 2:
          return false;
      }
    }
    getPublicErrorMessage(r) {
      var n;
      const t = ((n = this.extra) == null ? void 0 : n.backendErrorCode) ?? this.purchasesErrorCode ?? this.errorCode;
      switch (this.errorCode) {
        case 2:
          return `An unknown error occurred. Error code: ${t}.`;
        case 0:
          return `Purchase not started due to an error. Error code: ${t}.`;
        case 1:
          return "Payment failed.";
        case 3:
          return "Network error. Please check your internet connection.";
        case 4:
          return this.message;
        case 5:
          return "Email is required to complete the purchase.";
        case 6:
          return (r == null ? void 0 : r.productType) === Tr.Subscription ? "You are already subscribed to this product." : "You have already purchased this product.";
      }
    }
    static fromPurchasesError(r, t) {
      let n;
      return r.errorCode === Q.ProductAlreadyPurchasedError ? n = 6 : r.errorCode === Q.InvalidEmailError ? n = 5 : r.errorCode === Q.NetworkError ? n = 3 : n = t, new _H(
        n,
        r.message,
        r.underlyingErrorMessage,
        r.errorCode,
        r.extra
      );
    }
  };
  var _a = class {
    constructor(r, t = 10) {
      N(this, "operationSessionId", null);
      N(this, "backend");
      N(this, "maxNumberAttempts");
      N(this, "waitMSBetweenAttempts", 1e3);
      this.backend = r, this.maxNumberAttempts = t;
    }
    async startPurchase(r, t, n, i, o) {
      try {
        const a = await this.backend.postPurchase(
          r,
          t,
          i,
          o,
          n
        );
        return this.operationSessionId = a.operation_session_id, a;
      } catch (a) {
        if (a instanceof z)
          throw H.fromPurchasesError(
            a,
            0
            /* ErrorSettingUpPurchase */
          );
        {
          const s = "Unknown error starting purchase: " + String(a);
          throw F.errorLog(s), new H(
            2,
            s
          );
        }
      }
    }
    async pollCurrentPurchaseForCompletion() {
      const r = this.operationSessionId;
      if (!r)
        throw new H(
          0,
          "No purchase in progress"
        );
      return new Promise(
        (t, n) => {
          const i = (o = 1) => {
            if (o > this.maxNumberAttempts) {
              this.clearPurchaseInProgress(), n(
                new H(
                  2,
                  "Max attempts reached trying to get successful purchase status"
                )
              );
              return;
            }
            this.backend.getCheckoutStatus(r).then((a) => {
              switch (a.operation.status) {
                case dr.Started:
                case dr.InProgress:
                  setTimeout(
                    () => i(o + 1),
                    this.waitMSBetweenAttempts
                  );
                  break;
                case dr.Succeeded:
                  this.clearPurchaseInProgress(), t({
                    redemptionInfo: ha(a)
                  });
                  return;
                case dr.Failed:
                  this.clearPurchaseInProgress(), this.handlePaymentError(
                    a.operation.error,
                    n
                  );
              }
            }).catch((a) => {
              const s = H.fromPurchasesError(
                a,
                3
                /* NetworkError */
              );
              n(s);
            });
          };
          i();
        }
      );
    }
    clearPurchaseInProgress() {
      this.operationSessionId = null;
    }
    handlePaymentError(r, t) {
      if (r == null) {
        t(
          new H(
            2,
            "Got an error status but error field is empty."
          )
        );
        return;
      }
      switch (r.code) {
        case Ge.SetupIntentCreationFailed:
          t(
            new H(
              0,
              "Setup intent creation failed"
            )
          );
          return;
        case Ge.PaymentMethodCreationFailed:
          t(
            new H(
              0,
              "Payment method creation failed"
            )
          );
          return;
        case Ge.PaymentChargeFailed:
          t(
            new H(
              1,
              "Payment charge failed"
            )
          );
          return;
        case Ge.SetupIntentCompletionFailed:
          t(
            new H(
              0,
              "Setup intent completion failed"
            )
          );
          return;
        case Ge.AlreadyPurchased:
          t(
            new H(
              6,
              "Purchased was already completed"
            )
          );
          return;
        default:
          t(
            new H(
              2,
              "Unknown error code received"
            )
          );
          return;
      }
    }
  };
  var ga = `<svg width="96" height="96" viewBox="0 0 124 124" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="62" cy="62" r="62" fill="currentColor"/>
    <path d="M87.6668 41.504L82.4968 36.334L62.0002 56.8307L41.5035 36.334L36.3335 41.504L56.8302 62.0006L36.3335 82.4973L41.5035 87.6673L62.0002 67.1706L82.4968 87.6673L87.6668 82.4973L67.1702 62.0006L87.6668 41.504Z"
          fill="white"/>
</svg>
`;
  var ma = /* @__PURE__ */ w('<div style="color:var(--rc-color-error);" class="rcb-ui-asset-icon svelte-7wiquz"><!></div>');
  var ba = {
    hash: "svelte-7wiquz",
    code: ".rcb-ui-asset-icon.svelte-7wiquz {width:96px;height:96px;margin:0 auto;}"
  };
  function ya(e) {
    M(e, ba);
    var r = ma(), t = T(r);
    Pr(t, () => ga), h(e, r);
  }
  var Ea = /* @__PURE__ */ w("<button><!></button>");
  var wa = {
    hash: "svelte-2xwwo",
    code: `button.svelte-2xwwo {border:none;border-radius:var(--rc-shape-input-button-border-radius);font-size:16px;cursor:pointer;height:56px;color:var(--rc-color-grey-text-dark);background-color:var(--rc-color-grey-ui-dark);display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:rgba(0, 0, 0, 0);-webkit-tap-highlight-color:transparent;}button.svelte-2xwwo:focus,
  button.svelte-2xwwo:active {outline:2px solid var(--rc-color-focus);}button.intent-primary.svelte-2xwwo {background-color:var(--rc-color-primary);color:var(--rc-color-primary-text);font-size:16px;}button.svelte-2xwwo:disabled {color:var(--rc-color-grey-text-light);background-color:var(--rc-color-grey-ui-dark);}button.intent-primary.svelte-2xwwo:disabled {color:var(--rc-color-grey-text-light);background-color:var(--rc-color-grey-ui-dark);}`
  };
  function Et(e, r) {
    M(e, wa);
    let t = g(r, "intent", 8, "primary"), n = g(r, "disabled", 8, false), i = g(r, "testId", 8, void 0), o = g(r, "type", 8, void 0);
    var a = Ea(), s = T(a);
    G(s, r, "default", {}), C(() => {
      Mn(a, `${`intent-${t()}` ?? ""} svelte-2xwwo`), a.disabled = n(), te(a, "data-testid", i()), te(a, "type", o());
    }), Yr("click", a, function(u) {
      Fn.call(this, r, u);
    }), h(e, a);
  }
  var Ia = /* @__PURE__ */ w('<footer class="rcb-modal-footer svelte-1f9z0o8"><!></footer>');
  var xa = {
    hash: "svelte-1f9z0o8",
    code: "footer.svelte-1f9z0o8 {display:flex;flex-direction:column;}"
  };
  function wt(e, r) {
    M(e, xa);
    var t = Ia(), n = T(t);
    G(n, r, "default", {}), h(e, t);
  }
  var Pa = /* @__PURE__ */ w('<div class="column svelte-6o8e90"><!></div>');
  var Ta = {
    hash: "svelte-6o8e90",
    code: '.column.svelte-6o8e90 {display:flex;flex-direction:column;justify-content:flex-start;gap:var(--gap, "8px");flex-grow:1;}'
  };
  function hr(e, r) {
    M(e, Ta);
    let t = g(r, "gutter", 8, "8px");
    var n = Pa(), i = T(n);
    G(i, r, "default", {}), C(() => te(n, "style", `--gap:${t()};`)), h(e, n);
  }
  var Aa = "data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20id='mdi_close'%3e%3cpath%20id='Vector'%20d='M19%206.41L17.59%205L12%2010.59L6.41%205L5%206.41L10.59%2012L5%2017.59L6.41%2019L12%2013.41L17.59%2019L19%2017.59L13.41%2012L19%206.41Z'%20fill='%23767676'/%3e%3c/g%3e%3c/svg%3e";
  var Oa = /* @__PURE__ */ w('<button class="close-button svelte-1hv9ta1"><img alt="close"></button>');
  var ka = {
    hash: "svelte-1hv9ta1",
    code: ".close-button.svelte-1hv9ta1 {border:none;cursor:pointer;background-color:transparent;padding:0px;height:24px;border-radius:50%;}.close-button.svelte-1hv9ta1:focus {outline:2px solid var(--rc-color-focus);}"
  };
  function It(e, r) {
    M(e, ka);
    let t = g(r, "disabled", 8, false);
    var n = Oa(), i = T(n);
    te(i, "src", Aa), C(() => n.disabled = t()), Yr("click", n, function(o) {
      Fn.call(this, r, o);
    }), h(e, n);
  }
  var Na = /* @__PURE__ */ w('<picture class="rcb-app-icon-picture-container svelte-44qpq9"><source type="image/webp"> <img class="rcb-app-icon svelte-44qpq9" alt="App icon"></picture>');
  var Ra = /* @__PURE__ */ w('<div class="rcb-app-icon loading svelte-44qpq9"></div>');
  var Sa = {
    hash: "svelte-44qpq9",
    code: ".rcb-app-icon.svelte-44qpq9 {width:40px;height:40px;border-radius:12px;box-shadow:0px 1px 10px 0px rgba(0, 0, 0, 0.1);margin-right:16px;}.rcb-app-icon-picture-container.svelte-44qpq9 {height:40px;}.rcb-app-icon.loading.svelte-44qpq9 {background-color:gray;}"
  };
  function Xt(e, r) {
    M(e, Sa);
    let t = g(r, "src", 8, null), n = g(r, "srcWebp", 8, null);
    var i = fe(), o = $(i);
    L(
      o,
      () => t() !== null,
      (a) => {
        var s = Na(), u = T(s), l = R(u, 2);
        C(() => {
          te(u, "srcset", n()), te(l, "src", t());
        }), h(a, s);
      },
      (a) => {
        var s = Ra();
        h(a, s);
      }
    ), h(e, i);
  }
  var Jt = (e) => `https://da08ctfrofx1b.cloudfront.net/${e}`;
  var Ua = /* @__PURE__ */ w('<!> <span class="app-title svelte-10uf5fq"> </span>', 1);
  var La = /* @__PURE__ */ w('<div class="rcb-header-layout__business-info svelte-10uf5fq"><!></div>');
  var $a = {
    hash: "svelte-10uf5fq",
    code: ".app-title.svelte-10uf5fq {font-weight:500;margin:8px 0;font-size:16px;}.rcb-header-layout__business-info.svelte-10uf5fq {display:flex;align-items:center;}"
  };
  function Hn(e, r) {
    de(r, false), M(e, $a);
    let t = g(r, "brandingInfo", 8, null);
    ge();
    var n = La(), i = T(n);
    L(
      i,
      () => t() !== null,
      (o) => {
        var a = Ua(), s = $(a);
        L(s, () => t().app_icon_webp !== null && t().app_icon !== null, (f) => {
          var c = /* @__PURE__ */ ce(() => Jt(t().app_icon)), d = /* @__PURE__ */ ce(() => Jt(t().app_icon_webp));
          Xt(f, {
            get src() {
              return v(c);
            },
            get srcWebp() {
              return v(d);
            }
          });
        });
        var u = R(s, 2), l = T(u);
        C(() => re(l, t().seller_company_name)), h(o, a);
      },
      (o) => {
        Xt(o, {});
      }
    ), h(e, n), ve();
  }
  var Da = /* @__PURE__ */ w('<div class="rcb-post-purchase-header-layout svelte-17puakv"><!> <!></div>');
  var Ma = {
    hash: "svelte-17puakv",
    code: ".rcb-post-purchase-header-layout.svelte-17puakv {display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:-4px;}"
  };
  function Ba(e, r) {
    M(e, Ma);
    let t = g(r, "brandingInfo", 8, null), n = g(r, "onClose", 8);
    tr(e, {
      as: "header",
      children: (i, o) => {
        var a = Da(), s = T(a);
        Hn(s, {
          get brandingInfo() {
            return t();
          }
        });
        var u = R(s, 2);
        It(u, {
          $$events: {
            click(...l) {
              var f;
              (f = n()) == null || f.apply(this, l);
            }
          }
        }), h(i, a);
      },
      $$slots: { default: true }
    });
  }
  var Fa = /* @__PURE__ */ w('<span class="title svelte-idou50"> </span> <span class="subtitle svelte-idou50"><!></span>', 1);
  var qa = /* @__PURE__ */ w("<!> <!>", 1);
  var Ca = /* @__PURE__ */ w('<div class="rcb-modal-message svelte-idou50"><!></div>');
  var ja = /* @__PURE__ */ w("<!> <!> <!>", 1);
  var Ha = {
    hash: "svelte-idou50",
    code: ".rcb-modal-message.svelte-idou50 {width:100%;min-height:160px;display:flex;justify-content:center;align-items:center;flex-direction:column;text-align:center;margin-bottom:16px;margin-top:16px;}.title.svelte-idou50 {font-size:24px;line-height:1.25em;}.subtitle.svelte-idou50 {font-size:16px;line-height:1.25em;overflow-wrap:anywhere;}"
  };
  function Vn(e, r) {
    M(e, Ha);
    let t = g(r, "brandingInfo", 8, null), n = g(r, "onContinue", 8), i = g(r, "title", 8), o = g(r, "type", 8), a = g(r, "closeButtonTitle", 8, "Go back to app");
    hr(e, {
      gutter: "32px",
      children: (s, u) => {
        var l = ja(), f = $(l);
        Ba(f, {
          get brandingInfo() {
            return t();
          },
          get onClose() {
            return n();
          }
        });
        var c = R(f, 2);
        tr(c, {
          children: (p, E) => {
            var m = Ca(), P = T(m);
            hr(P, {
              gutter: "48px",
              children: (b, y) => {
                var I = qa(), _ = $(I);
                G(_, r, "icon", {});
                var x = R(_, 2);
                hr(x, {
                  gutter: "16px",
                  children: (q, k) => {
                    var B = Fa(), V = $(B), ne = T(V), Ne = R(V, 2), A = T(Ne);
                    G(A, r, "default", {}), C(() => re(ne, i())), h(q, B);
                  },
                  $$slots: { default: true }
                }), h(b, I);
              },
              $$slots: { default: true }
            }), C(() => te(m, "data-type", o())), h(p, m);
          },
          $$slots: { default: true }
        });
        var d = R(c, 2);
        wt(d, {
          children: (p, E) => {
            Et(p, {
              type: "submit",
              $$events: {
                click(...m) {
                  var P;
                  (P = n()) == null || P.apply(this, m);
                }
              },
              children: (m, P) => {
                var b = Me();
                C(() => re(b, a())), h(m, b);
              },
              $$slots: { default: true }
            });
          },
          $$slots: { default: true }
        }), h(s, l);
      },
      $$slots: { default: true }
    });
  }
  var Va = /* @__PURE__ */ w("<br>If this error persists, please contact <a> </a>.", 1);
  var Ga = /* @__PURE__ */ w(" <!>", 1);
  function Ya(e, r) {
    de(r, false);
    let t = g(r, "brandingInfo", 8, null), n = g(r, "lastError", 8), i = g(r, "supportEmail", 8, null), o = g(r, "productDetails", 8, null), a = g(r, "onContinue", 8);
    Wr(() => {
      F.errorLog(`Displayed error: ${K[n().errorCode]}. Message: ${n().message ?? "None"}. Underlying error: ${n().underlyingErrorMessage ?? "None"}`);
    });
    function s() {
      var l;
      switch (n().errorCode) {
        case K.AlreadyPurchasedError:
          return ((l = o()) == null ? void 0 : l.productType) === Tr.Subscription ? "Already subscribed" : "Already purchased";
        default:
          return "Something went wrong";
      }
    }
    ge();
    var u = /* @__PURE__ */ ce(s);
    Vn(e, {
      get title() {
        return v(u);
      },
      get brandingInfo() {
        return t();
      },
      get onContinue() {
        return a();
      },
      type: "error",
      closeButtonTitle: "Try Again",
      children: (l, f) => {
        var c = Ga(), d = $(c);
        C(() => re(d, `${n().getPublicErrorMessage(o()) ?? ""} `));
        var p = R(d);
        L(p, i, (E) => {
          var m = Va(), P = R($(m), 2), b = T(P);
          C(() => {
            te(P, "href", `mailto:${i() ?? ""}`), re(b, i());
          }), h(E, m);
        }), h(l, c);
      },
      $$slots: {
        default: true,
        icon: (l, f) => {
          ya(l);
        }
      }
    }), ve();
  }
  var Wa = `<svg width="96" height="96" viewBox="0 0 124 124" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <circle cx="62" cy="62" r="62" fill="currentColor"/>
    <rect x="44.1116" y="56" width="27.5" height="11" transform="rotate(45 44.1116 56)" fill="white"/>
    <rect x="79.1133" y="44.334" width="11" height="44" transform="rotate(45 79.1133 44.334)" fill="white"/>
</svg>
`;
  var za = /* @__PURE__ */ w('<div style="color:var(--rc-color-accent);" class="rcb-ui-asset-icon svelte-7wiquz"><!></div>');
  var Ka = {
    hash: "svelte-7wiquz",
    code: ".rcb-ui-asset-icon.svelte-7wiquz {width:96px;height:96px;margin:0 auto;}"
  };
  function Qa(e) {
    M(e, Ka);
    var r = za(), t = T(r);
    Pr(t, () => Wa), h(e, r);
  }
  function Za(e, r) {
    var a;
    de(r, false);
    let t = g(r, "productDetails", 8, null), n = g(r, "brandingInfo", 8, null), i = g(r, "onContinue", 8);
    const o = ((a = t()) == null ? void 0 : a.productType) === Tr.Subscription;
    ge(), Vn(e, {
      type: "success",
      title: "Purchase successful",
      get brandingInfo() {
        return n();
      },
      get onContinue() {
        return i();
      },
      closeButtonTitle: "Close",
      children: (s, u) => {
        var l = fe(), f = $(l);
        L(f, () => o, (c) => {
          var d = Me("Your plan is now active.");
          h(c, d);
        }), h(s, l);
      },
      $$slots: {
        default: true,
        icon: (s, u) => {
          Qa(s);
        }
      }
    }), ve();
  }
  function Xa(e, r, t, n, i = {}) {
    const o = t.create(r, i);
    return o.mount(e), o.on("change", (a) => n("change", a)), o.on("ready", (a) => n("ready", a)), o.on("focus", (a) => n("focus", a)), o.on("blur", (a) => n("blur", a)), o.on("escape", (a) => n("escape", a)), o.on("click", (a) => n("click", a)), o.on("loaderror", (a) => n("loaderror", a)), o.on("loaderstart", (a) => n("loaderstart", a)), o.on("networkschange", (a) => n("networkschange", a)), o;
  }
  var Ja = typeof window > "u";
  function es(e) {
    if (!Ja)
      return e.registerAppInfo({
        name: "svelte-stripe-js",
        url: "https://svelte-stripe-js.vercel.app"
      });
  }
  var rs = /* @__PURE__ */ w("<div></div>");
  function ts(e, r) {
    de(r, false);
    let t, n = ue();
    const i = $o(), { elements: o } = fo("stripe");
    let a = g(r, "options", 8, void 0);
    Wr(() => (t = Xa(v(n), "payment", o, i, a()), () => t.destroy()));
    function s() {
      t.blur();
    }
    function u() {
      t.clear();
    }
    function l() {
      t.destroy();
    }
    function f() {
      t.focus();
    }
    ge();
    var c = rs();
    return Uo(c, (d) => O(n, d), () => v(n)), h(e, c), Or(r, "blur", s), Or(r, "clear", u), Or(r, "destroy", l), Or(r, "focus", f), ve({ blur: s, clear: u, destroy: l, focus: f });
  }
  function ns(e, r) {
    de(r, false);
    const t = ue();
    let n = g(r, "stripe", 8), i = g(r, "mode", 8, void 0), o = g(r, "theme", 8, "stripe"), a = g(r, "variables", 24, () => ({})), s = g(r, "rules", 24, () => ({})), u = g(r, "labels", 8, "above"), l = g(r, "loader", 8, "auto"), f = g(r, "fonts", 24, () => []), c = g(r, "locale", 8, "auto"), d = g(r, "currency", 8, void 0), p = g(r, "amount", 8, void 0), E = g(r, "clientSecret", 8, void 0), m = g(r, "elements", 12, null);
    De(
      () => (Y(o()), Y(a()), Y(s()), Y(u())),
      () => {
        O(t, {
          theme: o(),
          variables: a(),
          rules: s(),
          labels: u()
        });
      }
    ), De(
      () => (Y(n()), Y(m()), Y(i()), Y(d()), Y(p()), v(t), Y(E()), Y(f()), Y(l()), Y(c()), Ft),
      () => {
        n() && !m() && (m(n().elements({
          mode: i(),
          currency: d(),
          amount: p(),
          appearance: v(t),
          clientSecret: E(),
          fonts: f(),
          loader: l(),
          locale: c()
        })), es(n()), Ft("stripe", {
          stripe: n(),
          elements: m()
        }));
      }
    ), De(
      () => (Y(m()), v(t), Y(c())),
      () => {
        m() && m().update({
          appearance: v(t),
          locale: c()
        });
      }
    ), gt(), ge();
    var P = fe(), b = $(P);
    L(b, () => n() && m(), (y) => {
      var I = fe(), _ = $(I);
      G(_, r, "default", {}), h(y, I);
    }), h(e, P), ve();
  }
  var Gn = "https://js.stripe.com/v3";
  var is = /^https:\/\/js\.stripe\.com\/v3\/?(\?.*)?$/;
  var en = "loadStripe.setLoadParameters was called but an existing Stripe.js script already exists in the document; existing script parameters will be used";
  var os = function() {
    for (var r = document.querySelectorAll('script[src^="'.concat(Gn, '"]')), t = 0; t < r.length; t++) {
      var n = r[t];
      if (is.test(n.src))
        return n;
    }
    return null;
  };
  var rn = function(r) {
    var t = "", n = document.createElement("script");
    n.src = "".concat(Gn).concat(t);
    var i = document.head || document.body;
    if (!i)
      throw new Error("Expected document.body not to be null. Stripe.js requires a <body> element.");
    return i.appendChild(n), n;
  };
  var as = function(r, t) {
    !r || !r._registerWrapper || r._registerWrapper({
      name: "stripe-js",
      version: "4.6.0",
      startTime: t
    });
  };
  var cr = null;
  var Nr = null;
  var Rr = null;
  var ss = function(r) {
    return function() {
      r(new Error("Failed to load Stripe.js"));
    };
  };
  var ls = function(r, t) {
    return function() {
      window.Stripe ? r(window.Stripe) : t(new Error("Stripe.js not available"));
    };
  };
  var cs = function(r) {
    return cr !== null ? cr : (cr = new Promise(function(t, n) {
      if (typeof window > "u" || typeof document > "u") {
        t(null);
        return;
      }
      if (window.Stripe && r && console.warn(en), window.Stripe) {
        t(window.Stripe);
        return;
      }
      try {
        var i = os();
        if (i && r)
          console.warn(en);
        else if (!i)
          i = rn(r);
        else if (i && Rr !== null && Nr !== null) {
          var o;
          i.removeEventListener("load", Rr), i.removeEventListener("error", Nr), (o = i.parentNode) === null || o === void 0 || o.removeChild(i), i = rn(r);
        }
        Rr = ls(t, n), Nr = ss(n), i.addEventListener("load", Rr), i.addEventListener("error", Nr);
      } catch (a) {
        n(a);
        return;
      }
    }), cr.catch(function(t) {
      return cr = null, Promise.reject(t);
    }));
  };
  var us = function(r, t, n) {
    if (r === null)
      return null;
    var i = r.apply(void 0, t);
    return as(i, n), i;
  };
  var ur;
  var Yn = false;
  var Wn = function() {
    return ur || (ur = cs(null).catch(function(r) {
      return ur = null, Promise.reject(r);
    }), ur);
  };
  Promise.resolve().then(function() {
    return Wn();
  }).catch(function(e) {
    Yn || console.warn(e);
  });
  var fs = function() {
    for (var r = arguments.length, t = new Array(r), n = 0; n < r; n++)
      t[n] = arguments[n];
    Yn = true;
    var i = Date.now();
    return Wn().then(function(o) {
      return us(o, t, i);
    });
  };
  var ds = /* @__PURE__ */ w('<div class="rcb-header-layout svelte-1xe711j"><!></div>');
  var vs = {
    hash: "svelte-1xe711j",
    code: ".rcb-header-layout.svelte-1xe711j {display:flex;justify-content:space-between;align-items:center;width:100%;font-size:24px;margin:0;font-weight:500;}"
  };
  function xt(e, r) {
    M(e, vs), tr(e, {
      as: "header",
      children: (t, n) => {
        var i = ds(), o = T(i);
        G(o, r, "default", {}), h(t, i);
      },
      $$slots: { default: true }
    });
  }
  var ps = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"
     xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15.1 8H8.9V6C8.9 4.29 10.29 2.9 12 2.9C13.71 2.9 15.1 4.29 15.1 6V8Z"
          fill="currentColor"/>
</svg>
`;
  var hs = /* @__PURE__ */ w('<div style="color:var(--rc-color-accent);" class="rcb-ui-asset-icon svelte-1z0jca3"><!></div>');
  var _s = {
    hash: "svelte-1z0jca3",
    code: "div.svelte-1z0jca3 {height:24px;width:24px;}"
  };
  function gs(e) {
    M(e, _s);
    var r = hs(), t = T(r);
    Pr(t, () => ps), h(e, r);
  }
  var ms = /* @__PURE__ */ w('<div class="processing svelte-rjmul6"></div>');
  var bs = {
    hash: "svelte-rjmul6",
    code: `.processing.svelte-rjmul6 {width:12px;aspect-ratio:1;border-radius:50%;
    animation: svelte-rjmul6-l5 1.5s infinite linear;}
  @keyframes svelte-rjmul6-l5 {
    0% {
      box-shadow:
        20px 0 #fff2,
        -20px 0 #fff2;
      background: #fff2;
    }
    25% {
      box-shadow:
        20px 0 #fff2,
        -20px 0 #ffff;
      background: #fff2;
    }
    50% {
      box-shadow:
        20px 0 #fff2,
        -20px 0 #fff2;
      background: #ffff;
    }
    75% {
      box-shadow:
        20px 0 #ffff,
        -20px 0 #fff2;
      background: #fff2;
    }
    100% {
      box-shadow:
        20px 0 #fff2,
        -20px 0 #fff2;
      background: #fff2;
    }
  }`
  };
  function zn(e) {
    M(e, bs);
    var r = ms();
    h(e, r);
  }
  var ys = {
    error: "#f2545b",
    warning: "#f4e971",
    focus: "#000080",
    accent: "#767676",
    primary: "#000000",
    "primary-text": "#ffffff",
    white: "#ffffff",
    "grey-text-dark": "rgba(0,0,0,1)",
    "grey-text-light": "rgba(0,0,0,0.5)",
    "grey-ui-dark": "rgba(0,0,0,0.125)",
    "grey-ui-light": "rgba(0,0,0,0.005)",
    "input-background": "transparent",
    background: "white"
  };
  var Es = {
    error: "#f2545b",
    warning: "#f4e971",
    focus: "#000080",
    accent: "#767676",
    primary: "#ffffff",
    "primary-text": "#000000",
    white: "#ffffff",
    "grey-text-dark": "rgba(255,255,255,1)",
    "grey-text-light": "rgba(255,255,255,0.5)",
    "grey-ui-dark": "rgba(255,255,255,0.125)",
    "grey-ui-light": "rgba(255,255,255,0.005)",
    "input-background": "transparent",
    background: "#000000"
  };
  var Kn = {
    error: "color_error",
    focus: "color_accent",
    accent: "color_accent",
    primary: "color_buttons_primary"
  };
  var ws = {
    ...Kn,
    background: "color_form_bg"
  };
  var Is = {
    ...Kn,
    background: "color_product_info_bg"
  };
  var Qn = {
    "input-border-radius": "12px",
    "input-button-border-radius": "12px",
    "modal-border-radius": "16px"
  };
  var xs = {
    "input-border-radius": "0px",
    "input-button-border-radius": "0px",
    "modal-border-radius": "0px"
  };
  var Ps = {
    "input-border-radius": "24px",
    "input-button-border-radius": "56px",
    "modal-border-radius": "16px"
  };
  var tn = Qn;
  var nn = (e) => e.length == 7 ? {
    r: parseInt(e.slice(1, 3), 16),
    g: parseInt(e.slice(3, 5), 16),
    b: parseInt(e.slice(5, 7), 16)
  } : e.length == 4 ? {
    r: parseInt(e[1], 16),
    g: parseInt(e[2], 16),
    b: parseInt(e[3], 16)
  } : null;
  var Zn = ({
    r: e,
    g: r,
    b: t,
    luminanceThreshold: n
  }) => {
    const i = (a) => (a = a / 255, a <= 0.03928 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4));
    return 0.2126 * i(e) + 0.7152 * i(r) + 0.0722 * i(t) > n;
  };
  var Xn = 0.37;
  var Ts = (e, r = Xn) => {
    const t = Zn({ ...e, luminanceThreshold: r }) ? "0,0,0" : "255,255,255";
    return {
      "grey-text-dark": `rgba(${t},1.0)`,
      "grey-text-light": `rgba(${t},0.50)`,
      "grey-ui-dark": `rgba(${t},0.125)`,
      "grey-ui-light": `rgba(${t},0.05)`
    };
  };
  var As = (e, r, t, n = Xn) => {
    const i = {
      "grey-text-dark": t["grey-text-dark"],
      "grey-text-light": t["grey-text-light"],
      "grey-ui-dark": t["grey-ui-dark"],
      "grey-ui-light": t["grey-ui-light"],
      "primary-text": t["primary-text"]
    };
    if (e != null && e.startsWith("#")) {
      const o = nn(e);
      o !== null && Object.assign(i, Ts(o));
    }
    if (r != null && r.startsWith("#")) {
      const o = nn(r);
      o !== null && (i["primary-text"] = Zn({ ...o, luminanceThreshold: n }) ? "black" : "white");
    }
    return i;
  };
  var Os = (e, r) => e || r;
  var ks = (e, r, t) => {
    const n = Object.entries(e).map(([i, o]) => [
      i,
      Os(
        t ? t[o] : null,
        r[i]
      )
    ]);
    return Object.fromEntries(n);
  };
  var Jn = (e, r, t) => {
    const n = ks(
      e,
      r,
      t
    );
    return t ? {
      ...r,
      ...n,
      ...As(
        n.background,
        n.primary,
        r
      )
    } : { ...r };
  };
  var Ns = (e) => Jn(
    Is,
    Es,
    e
  );
  var ei = (e) => Jn(
    ws,
    ys,
    e
  );
  var Pt = (e) => {
    if (!e)
      return tn;
    switch (e.shapes) {
      case "rounded":
        return Qn;
      case "rectangle":
        return xs;
      case "pill":
        return Ps;
      default:
        return tn;
    }
  };
  var Mr = (e = "", r) => r.map(([t, n]) => `--rc-${e}-${t}: ${n}`).join("; ");
  var ri = (e) => {
    const r = Mr(
      "color",
      Object.entries(Ns(e))
    ), t = Mr(
      "shape",
      Object.entries(Pt(e))
    );
    return [r, t].join("; ");
  };
  var Rs = (e) => {
    const r = Mr(
      "color",
      Object.entries(ei(e))
    ), t = Mr(
      "shape",
      Object.entries(Pt(e))
    );
    return [r, t].join("; ");
  };
  var Tt = class {
    constructor(r) {
      this.brandingAppearance = r;
    }
    get shape() {
      return Pt(this.brandingAppearance);
    }
    get formColors() {
      return ei(this.brandingAppearance);
    }
    get formStyleVars() {
      return Rs(this.brandingAppearance);
    }
    get productInfoStyleVars() {
      return ri(this.brandingAppearance);
    }
  };
  var Ss = /* @__PURE__ */ w('<div style="display: flex; align-items: center; justify-content: baseline;"><!> <div style="margin-left: 10px">Secure Checkout</div></div> <!>', 1);
  var Us = /* @__PURE__ */ w('<div class="rcb-stripe-elements-container svelte-8jsoa8"><!></div>');
  var Ls = /* @__PURE__ */ w("<!> <!>", 1);
  var $s = /* @__PURE__ */ w("<!> <form><!></form>", 1);
  var Ds = /* @__PURE__ */ w("<div><!></div>");
  var Ms = {
    hash: "svelte-8jsoa8",
    code: `.rcb-stripe-elements-container.svelte-8jsoa8 {width:100%;

        /* The standard height of the payment form from Stripe */
        /* Added to avoid the card getting smaller while loading */min-height:320px;margin-top:32px;margin-bottom:24px;}`
  };
  function Bs(e, r) {
    var _;
    de(r, false), M(e, Ms);
    let t = g(r, "onClose", 8), n = g(r, "onContinue", 8), i = g(r, "onError", 8), o = g(r, "paymentInfoCollectionMetadata", 8), a = g(r, "processing", 12, false), s = g(r, "productDetails", 8), u = g(r, "purchaseOptionToUse", 8), l = g(r, "brandingInfo", 8);
    const f = o().data.client_secret;
    let c = ue(null), d = ue(), p = ue();
    Wr(async () => {
      const x = o().data.publishable_api_key, q = o().data.stripe_account_id;
      if (!x || !q)
        throw new Error("Stripe publishable key or account ID not found");
      O(c, await fs(x, { stripeAccount: q }));
    });
    const E = async () => {
      if (a() || !v(c) || !v(p)) return;
      a(true);
      const x = await v(c).confirmSetup({
        elements: v(p),
        redirect: "if_required"
      });
      x.error ? (a(false), i()(new H(K.StripeError, x.error.message))) : n()();
    }, m = new Tt((_ = l()) == null ? void 0 : _.appearance);
    let P = m.shape, b = m.formColors;
    De(() => v(d), () => {
      v(d) && v(d)._elements.length > 0 && O(p, v(d));
    }), gt(), ge();
    var y = Ds(), I = T(y);
    L(
      I,
      () => v(c) && f,
      (x) => {
        var q = $s(), k = $(q);
        xt(k, {
          children: (A, j) => {
            var ie = Ss(), Fe = $(ie), nr = T(Fe);
            gs(nr);
            var qe = R(Fe, 2);
            It(qe, {
              $$events: {
                click(...Ce) {
                  var me;
                  (me = t()) == null || me.apply(this, Ce);
                }
              }
            }), h(A, ie);
          },
          $$slots: { default: true }
        });
        var B = R(k, 2), V = T(B), ne = /* @__PURE__ */ ce(() => ({
          borderRadius: P["input-border-radius"],
          fontSizeBase: "16px",
          fontSizeSm: "16px",
          spacingGridRow: "16px",
          focusBoxShadow: "none",
          colorDanger: b.error,
          colorTextPlaceholder: b["grey-text-light"]
        })), Ne = /* @__PURE__ */ ce(() => ({
          ".Input": {
            boxShadow: "none",
            border: `2px solid ${b["grey-ui-dark"]}`,
            backgroundColor: "transparent",
            color: b["grey-text-dark"]
          },
          ".Input:focus": {
            border: `2px solid ${b.focus}`,
            outline: "none"
          },
          ".Label": {
            marginBottom: "8px",
            fontWeight: "500",
            lineHeight: "22px",
            color: b["grey-text-dark"]
          },
          ".Input--invalid": { boxShadow: "none" },
          ".Tab": {
            boxShadow: "none",
            backgroundColor: "transparent"
          }
        }));
        ns(V, {
          get stripe() {
            return v(c);
          },
          clientSecret: f,
          loader: "always",
          locale: "en",
          get elements() {
            return v(d);
          },
          set elements(A) {
            O(d, A);
          },
          theme: "stripe",
          get variables() {
            return v(ne);
          },
          get rules() {
            return v(Ne);
          },
          children: (A, j) => {
            var ie = Ls(), Fe = $(ie);
            tr(Fe, {
              children: (qe, Ce) => {
                var me = Us(), Ar = T(me);
                ts(Ar, {}), h(qe, me);
              },
              $$slots: { default: true }
            });
            var nr = R(Fe, 2);
            wt(nr, {
              children: (qe, Ce) => {
                hr(qe, {
                  children: (me, Ar) => {
                    Et(me, {
                      get disabled() {
                        return a();
                      },
                      testId: "PayButton",
                      children: (Kr, Re) => {
                        var ir = fe(), pe = $(ir);
                        L(
                          pe,
                          a,
                          (Pe) => {
                            zn(Pe);
                          },
                          (Pe) => {
                            var be = fe(), Se = $(be);
                            L(
                              Se,
                              () => {
                                var X, J;
                                return (J = (X = s().subscriptionOptions) == null ? void 0 : X[u().id]) == null ? void 0 : J.trial;
                              },
                              (X) => {
                                var J = Me("Start Trial");
                                h(X, J);
                              },
                              (X) => {
                                var J = Me("Pay");
                                h(X, J);
                              },
                              true
                            ), h(Pe, be);
                          }
                        ), h(Kr, ir);
                      },
                      $$slots: { default: true }
                    });
                  },
                  $$slots: { default: true }
                });
              },
              $$slots: { default: true }
            }), h(A, ie);
          },
          $$slots: { default: true },
          $$legacy: true
        }), Yr("submit", B, Bn(E)), h(x, q);
      },
      (x) => {
        ut(x);
      }
    ), h(e, y), ve();
  }
  function Fs(e) {
    return e.trim() === "" ? "You need to provide your email address to continue." : e.match(/^[^@]+@[^@]+\.[^@]+$/) ? null : "Email is not valid. Please provide a valid email address.";
  }
  function qs(e) {
    if (e && !e.match(/^[A-Z]{3}$/)) {
      const r = `Currency code ${e} is not valid. Please provide a valid ISO 4217 currency code.`;
      throw F.errorLog(r), new z(Q.ConfigurationError, r);
    }
  }
  var Cs = /* @__PURE__ */ w("<span>Billing email address</span> <!>", 1);
  var js = /* @__PURE__ */ w('<div class="form-error svelte-yf01ty"> </div>');
  var Hs = /* @__PURE__ */ w('<div class="form-container svelte-yf01ty"><div class="form-label svelte-yf01ty"><label for="email">Email</label></div> <div><input name="email" placeholder="john@appleseed.com" autocapitalize="off" class="svelte-yf01ty"></div> <!></div>');
  var Vs = /* @__PURE__ */ w('<div class="container svelte-yf01ty"><!> <form class="svelte-yf01ty"><!> <!></form></div>');
  var Gs = {
    hash: "svelte-yf01ty",
    code: ".container.svelte-yf01ty {display:flex;flex-direction:column;flex-grow:1;}form.svelte-yf01ty {display:flex;flex-direction:column;min-height:100%;flex-grow:1;}.form-container.svelte-yf01ty {display:flex;flex-direction:column;width:100%;margin-top:32px;margin-bottom:16px;}.form-label.svelte-yf01ty {margin-top:8px;margin-bottom:8px;display:block;font-weight:500;line-height:22px;}.form-input.error.svelte-yf01ty input:where(.svelte-yf01ty) {border-color:var(--rc-color-error);}.form-error.svelte-yf01ty {margin-top:4px;font-size:16px;line-height:20px;min-height:40px;color:var(--rc-color-error);}input.svelte-yf01ty {width:100%;box-sizing:border-box;padding:8px;border:2px solid var(--rc-color-grey-ui-dark);border-radius:var(--rc-shape-input-border-radius);font-size:16px;height:48px;padding:6px 14px;background:var(--rc-color-input-background);color:inherit;}input.svelte-yf01ty:focus {outline:none;border:2px solid var(--rc-color-focus);}"
  };
  function Ys(e, r) {
    de(r, false), M(e, Gs);
    const t = ue(), n = ue(), i = ue();
    let o = g(r, "onContinue", 8), a = g(r, "onClose", 8), s = g(r, "processing", 8), u = g(r, "lastError", 8);
    const l = async () => {
      const m = Fs(v(t));
      m ? O(n, m) : o()({ email: v(t) });
    };
    Do(async () => {
      var m;
      O(n, ((m = u()) == null ? void 0 : m.message) ?? "");
    }), De(() => {
    }, () => {
      O(t, "");
    }), De(() => {
    }, () => {
      O(n, "");
    }), De(() => v(n), () => {
      O(i, v(n) ? "error" : "");
    }), gt(), ge();
    var f = Vs(), c = T(f);
    xt(c, {
      children: (m, P) => {
        var b = Cs(), y = R($(b), 2);
        It(y, {
          $$events: {
            click(...I) {
              var _;
              (_ = a()) == null || _.apply(this, I);
            }
          }
        }), h(m, b);
      },
      $$slots: { default: true }
    });
    var d = R(c, 2), p = T(d);
    tr(p, {
      children: (m, P) => {
        var b = Hs(), y = R(T(b), 2), I = T(y), _ = R(y, 2);
        L(_, () => v(n), (x) => {
          var q = js(), k = T(q);
          C(() => re(k, v(n))), h(x, q);
        }), C(() => Mn(y, `form-input ${v(i) ?? ""} svelte-yf01ty`)), So(I, () => v(t), (x) => O(t, x)), h(m, b);
      },
      $$slots: { default: true }
    });
    var E = R(p, 2);
    wt(E, {
      children: (m, P) => {
        hr(m, {
          children: (b, y) => {
            Et(b, {
              get disabled() {
                return s();
              },
              type: "submit",
              children: (I, _) => {
                var x = fe(), q = $(x);
                L(
                  q,
                  s,
                  (k) => {
                    zn(k);
                  },
                  (k) => {
                    var B = Me("Continue");
                    h(k, B);
                  }
                ), h(I, x);
              },
              $$slots: { default: true }
            });
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    }), Yr("submit", d, Bn(l)), h(e, f), ve();
  }
  var Ws = /* @__PURE__ */ w('<div class="rcb-modal-backdrop svelte-17tslso"><!></div>');
  var zs = {
    hash: "svelte-17tslso",
    code: ".rcb-modal-backdrop.svelte-17tslso {position:fixed;top:0;left:0;right:0;min-width:100%;width:100vw;width:100dvw;min-height:100%;height:100vh;height:100dvh;background-color:rgba(40, 40, 40, 0.75);display:flex;flex-direction:column;justify-content:space-around;z-index:1000001;}"
  };
  function Ks(e, r) {
    M(e, zs);
    var t = Ws(), n = T(t);
    G(n, r, "default", {}), h(e, t);
  }
  var Qs = /* @__PURE__ */ w('<div class="rcb-modal-container svelte-1fufj5b"><main class="rcb-modal-main svelte-1fufj5b"><!></main></div>');
  var Zs = {
    hash: "svelte-1fufj5b",
    code: `.rcb-modal-container.svelte-1fufj5b {width:100%;}.rcb-modal-main.svelte-1fufj5b {box-sizing:border-box;border-radius:var(--rc-shape-modal-border-radius);background-color:var(--rc-color-background);color:var(--rc-color-grey-text-dark);padding:40px;flex-direction:column;display:flex;}

    @media screen and (max-width: 960px) {.rcb-modal-container.svelte-1fufj5b {width:calc(100% - 32px);min-width:300px;max-width:640px;margin:auto;}.rcb-modal-main.svelte-1fufj5b {min-width:300px;max-width:640px;padding:32px;}
    }`
  };
  function ti(e, r) {
    M(e, Zs);
    let t = g(r, "style", 8, "");
    var n = Qs(), i = T(n), o = T(i);
    G(o, r, "default", {}), C(() => te(i, "style", t())), h(e, n);
  }
  function Xs(e, r) {
    let t = g(r, "condition", 8, false);
    var n = fe(), i = $(n);
    L(
      i,
      t,
      (o) => {
        Ks(o, {
          children: (a, s) => {
            var u = fe(), l = $(u);
            G(l, r, "default", {}), h(a, u);
          },
          $$slots: { default: true }
        });
      },
      (o) => {
        var a = fe(), s = $(a);
        G(s, r, "default", {}), h(o, a);
      }
    ), h(e, n);
  }
  var Js = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"
     xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.5" clip-path="url(#clip0_344_3390)">
        <path d="M7 18C5.9 18 5.01 18.9 5.01 20C5.01 21.1 5.9 22 7 22C8.1 22 9 21.1 9 20C9 18.9 8.1 18 7 18ZM1 2V4H3L6.6 11.59L5.25 14.04C5.09 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.28 15 7.17 14.89 7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.59 17.3 11.97L20.88 5.48C20.96 5.34 21 5.17 21 5C21 4.45 20.55 4 20 4H5.21L4.27 2H1ZM17 18C15.9 18 15.01 18.9 15.01 20C15.01 21.1 15.9 22 17 22C18.1 22 19 21.1 19 20C19 18.9 18.1 18 17 18Z"
              fill="currentColor"/>
    </g>
    <defs>
        <clipPath id="clip0_344_3390">
            <rect width="24" height="24" fill="currentColor"/>
        </clipPath>
    </defs>
</svg>
`;
  var el = /* @__PURE__ */ w('<div style="color:var(--rc-color-gray-text-dark);"><!></div>');
  function rl(e) {
    var r = el(), t = T(r);
    Pr(t, () => Js), h(e, r);
  }
  var tl = /* @__PURE__ */ w('<div class="svelte-1ny4y2s">Sandbox</div>');
  var nl = {
    hash: "svelte-1ny4y2s",
    code: "div.svelte-1ny4y2s {background-color:var(--rc-color-warning);color:rgba(0,0,0,1);font-size:10px;font-weight:bold;text-transform:uppercase;padding:4px 10px;line-height:10px;border-radius:9px;margin:0px;margin-left:16px;}"
  };
  function il(e) {
    M(e, nl);
    var r = tl();
    h(e, r);
  }
  var ol = /* @__PURE__ */ w('<div class="rcb-ui-layout svelte-1iuls9l"><!></div>');
  var al = {
    hash: "svelte-1iuls9l",
    code: `.rcb-ui-layout.svelte-1iuls9l {width:100vw;margin-right:auto;display:flex;justify-content:center;align-items:flex-start;position:relative;padding:0px 80px;box-sizing:border-box;}

    @media screen and (max-width: 960px) {.rcb-ui-layout.svelte-1iuls9l {flex-direction:column;align-items:center;justify-content:center;height:100%;min-width:100%;}
    }

    @media screen and (max-width: 960px) and (max-height: 960px) {.rcb-ui-layout.svelte-1iuls9l {overflow-y:scroll;justify-content:flex-start;padding:16px 0;}
    }`
  };
  function sl(e, r) {
    M(e, al);
    let t = g(r, "style", 8, "");
    var n = ol(), i = T(n);
    G(i, r, "default", {}), C(() => te(n, "style", t())), h(e, n);
  }
  var ll = /* @__PURE__ */ w('<div class="rcb-ui-container svelte-1sfb5if"><!></div>');
  var cl = {
    hash: "svelte-1sfb5if",
    code: `.rcb-ui-container.svelte-1sfb5if {color-scheme:none;font-size:16px;line-height:1.5em;font-weight:400;font-family:-apple-system, "system-ui", "Segoe UI", Roboto, Oxygen, Ubuntu,
        Cantarell, "Open Sans", "Helvetica Neue", sans-serif;}`
  };
  function ul(e, r) {
    M(e, cl);
    let t = g(r, "style", 8, "");
    var n = ll(), i = T(n);
    G(i, r, "default", {}), C(() => te(n, "style", t())), h(e, n);
  }
  var fl = /* @__PURE__ */ w("<!> <!>", 1);
  var dl = /* @__PURE__ */ w('<div class="rcb-ui-aside svelte-17dr902"><!></div>');
  var vl = {
    hash: "svelte-17dr902",
    code: `.rcb-ui-aside.svelte-17dr902 {margin-right:16px;flex:320px 1 0;max-width:480px;}

    @media screen and (max-width: 960px) {.rcb-ui-aside.svelte-17dr902 {margin-right:0;margin-bottom:16px;min-width:100%;display:flex;flex-direction:column;align-items:center;flex:none;max-width:none;}
    }`
  };
  function pl(e, r) {
    de(r, false), M(e, vl);
    let t = g(r, "brandingAppearance", 8, void 0), n = new Tt(t()).productInfoStyleVars;
    ge();
    var i = dl();
    te(i, "style", n);
    var o = T(i);
    ti(o, {
      children: (a, s) => {
        var u = fl(), l = $(u);
        G(l, r, "header", {});
        var f = R(l, 2);
        G(f, r, "default", {}), h(a, u);
      },
      $$slots: { default: true }
    }), h(e, i), ve();
  }
  var hl = /* @__PURE__ */ w("<!> <!>", 1);
  var _l = /* @__PURE__ */ w('<div class="rcb-ui-main svelte-vpgys"><!></div>');
  var gl = {
    hash: "svelte-vpgys",
    code: `.rcb-ui-main.svelte-vpgys {flex:480px 1 0;max-width:640px;}

    @media screen and (max-width: 960px) {.rcb-ui-main.svelte-vpgys {flex:none;max-width:none;min-width:100%;}
    }`
  };
  function ml(e, r) {
    de(r, false), M(e, gl);
    let t = g(r, "brandingAppearance", 8, void 0), n = new Tt(t()).formStyleVars;
    ge();
    var i = _l();
    te(i, "style", n);
    var o = T(i);
    ti(o, {
      style: "min-height: 360px;",
      children: (a, s) => {
        var u = hl(), l = $(u);
        G(l, r, "header", {});
        var f = R(l, 2);
        G(f, r, "default", {}), h(a, u);
      },
      $$slots: { default: true }
    }), h(e, i), ve();
  }
  var bl = /* @__PURE__ */ w("<!> <!>", 1);
  var yl = /* @__PURE__ */ w("<!> <!> <!> <!> <!> <!> <!>", 1);
  var El = /* @__PURE__ */ w("<!> <!>", 1);
  function wl(e, r) {
    de(r, false);
    let t = g(r, "asModal", 8, true), n = g(r, "customerEmail", 12), i = g(r, "appUserId", 8), o = g(r, "rcPackage", 8), a = g(r, "purchaseOption", 8), s = g(r, "brandingInfo", 8), u = g(r, "onFinished", 8), l = g(r, "onError", 8), f = g(r, "onClose", 8), c = g(r, "purchases", 8), d = g(r, "purchaseOperationHelper", 8), p = ue(""), E = ue(null), m = ue(null), P = ue(null);
    const b = o().rcBillingProduct.identifier ?? null, y = o().rcBillingProduct.defaultPurchaseOption, I = a() ? a() : y;
    let _ = ue("present-offer"), x = null;
    const q = [
      "present-offer",
      "needs-auth-info",
      "processing-auth-info",
      "needs-payment-info",
      "polling-purchase-status",
      "loading"
    ];
    Wr(async () => {
      var A;
      if (O(E, o().rcBillingProduct), O(p, ri((A = s()) == null ? void 0 : A.appearance)), v(_) === "present-offer") {
        n() ? B() : O(_, "needs-auth-info");
        return;
      }
    });
    const k = () => {
      f()();
    }, B = () => {
      if (b === null) {
        ne(new H(K.ErrorSettingUpPurchase, "Product ID was not set before purchase."));
        return;
      } else v(_) === "present-offer" && O(_, "loading");
      if (!n()) {
        ne(new H(K.MissingEmailError));
        return;
      }
      d().startPurchase(i(), b, I, n(), o().rcBillingProduct.presentedOfferingContext).then((A) => {
        if (A.next_action === "collect_payment_info") {
          O(P, null), O(_, "needs-payment-info"), O(m, A);
          return;
        }
        if (A.next_action === "completed") {
          O(P, null), O(_, "success");
          return;
        }
      }).catch((A) => {
        ne(A);
      });
    }, V = (A) => {
      if (v(_) === "needs-auth-info") {
        A && (n(A.email), O(_, "processing-auth-info")), B();
        return;
      }
      if (v(_) === "needs-payment-info") {
        O(_, "polling-purchase-status"), d().pollCurrentPurchaseForCompletion().then((j) => {
          O(_, "success"), x = j.redemptionInfo;
        }).catch((j) => {
          ne(j);
        });
        return;
      }
      if (v(_) === "success" || v(_) === "error") {
        u()(x);
        return;
      }
      O(_, "success");
    }, ne = (A) => {
      if (v(_) === "processing-auth-info" && A.isRecoverable()) {
        O(P, A), O(_, "needs-auth-info");
        return;
      }
      O(P, A), O(_, "error");
    }, Ne = () => {
      l()(v(P) ?? new H(K.UnknownError, "Unknown error without state set."));
    };
    ge(), ul(e, {
      children: (A, j) => {
        Xs(A, {
          get condition() {
            return t();
          },
          children: (ie, Fe) => {
            sl(ie, {
              get style() {
                return v(p);
              },
              children: (nr, qe) => {
                var Ce = El(), me = $(Ce);
                L(me, () => q.includes(v(_)), (Re) => {
                  var ir = /* @__PURE__ */ ce(() => {
                    var pe;
                    return (pe = s()) == null ? void 0 : pe.appearance;
                  });
                  pl(Re, {
                    get brandingAppearance() {
                      return v(ir);
                    },
                    children: (pe, Pe) => {
                      var be = fe(), Se = $(be);
                      L(Se, () => v(E) && I, (X) => {
                        var J = /* @__PURE__ */ ce(() => {
                          var Ue;
                          return (Ue = s()) == null ? void 0 : Ue.appearance;
                        });
                        Zt(X, {
                          get productDetails() {
                            return v(E);
                          },
                          get brandingAppearance() {
                            return v(J);
                          },
                          purchaseOption: I
                        });
                      }), h(pe, be);
                    },
                    $$slots: {
                      default: true,
                      header: (pe, Pe) => {
                        xt(pe, {
                          slot: "header",
                          children: (be, Se) => {
                            var X = bl(), J = $(X);
                            Hn(J, {
                              get brandingInfo() {
                                return s();
                              }
                            });
                            var Ue = R(J, 2);
                            L(
                              Ue,
                              () => c().isSandbox(),
                              (or) => {
                                il(or);
                              },
                              (or) => {
                                rl(or);
                              }
                            ), h(be, X);
                          },
                          $$slots: { default: true }
                        });
                      }
                    }
                  });
                });
                var Ar = R(me, 2), Kr = /* @__PURE__ */ ce(() => {
                  var Re;
                  return (Re = s()) == null ? void 0 : Re.appearance;
                });
                ml(Ar, {
                  get brandingAppearance() {
                    return v(Kr);
                  },
                  children: (Re, ir) => {
                    var pe = yl(), Pe = $(pe);
                    L(Pe, () => v(_) === "present-offer" && v(E) && I, (oe) => {
                      Zt(oe, {
                        get productDetails() {
                          return v(E);
                        },
                        purchaseOption: I
                      });
                    });
                    var be = R(Pe, 2);
                    L(be, () => v(_) === "present-offer" && !v(E), (oe) => {
                      ut(oe);
                    });
                    var Se = R(be, 2);
                    L(Se, () => v(_) === "needs-auth-info" || v(_) === "processing-auth-info", (oe) => {
                      var ar = /* @__PURE__ */ ce(() => v(_) === "processing-auth-info");
                      Ys(oe, {
                        onContinue: V,
                        onClose: k,
                        get processing() {
                          return v(ar);
                        },
                        get lastError() {
                          return v(P);
                        }
                      });
                    });
                    var X = R(Se, 2);
                    L(X, () => v(m) && (v(_) === "needs-payment-info" || v(_) === "polling-purchase-status") && v(E) && I, (oe) => {
                      var ar = /* @__PURE__ */ ce(() => v(_) === "polling-purchase-status");
                      Bs(oe, {
                        get paymentInfoCollectionMetadata() {
                          return v(m);
                        },
                        onContinue: V,
                        onClose: k,
                        onError: ne,
                        get processing() {
                          return v(ar);
                        },
                        get productDetails() {
                          return v(E);
                        },
                        purchaseOptionToUse: I,
                        get brandingInfo() {
                          return s();
                        }
                      });
                    });
                    var J = R(X, 2);
                    L(J, () => v(_) === "loading", (oe) => {
                      ut(oe);
                    });
                    var Ue = R(J, 2);
                    L(Ue, () => v(_) === "error", (oe) => {
                      var ar = /* @__PURE__ */ ce(() => v(P) ?? new H(K.UnknownError, "Unknown error without state set.")), di = /* @__PURE__ */ ce(() => {
                        var At;
                        return (At = s()) == null ? void 0 : At.seller_company_support_email;
                      });
                      Ya(oe, {
                        get brandingInfo() {
                          return s();
                        },
                        get lastError() {
                          return v(ar);
                        },
                        get supportEmail() {
                          return v(di);
                        },
                        get productDetails() {
                          return v(E);
                        },
                        onContinue: Ne
                      });
                    });
                    var or = R(Ue, 2);
                    L(or, () => v(_) === "success", (oe) => {
                      Za(oe, {
                        get productDetails() {
                          return v(E);
                        },
                        get brandingInfo() {
                          return s();
                        },
                        onContinue: V
                      });
                    }), h(Re, pe);
                  },
                  $$slots: { default: true }
                }), h(nr, Ce);
              },
              $$slots: { default: true }
            });
          },
          $$slots: { default: true }
        });
      },
      $$slots: { default: true }
    }), ve();
  }
  function Il(e) {
    return e.expires_date == null ? true : new Date(e.expires_date) > /* @__PURE__ */ new Date();
  }
  function xl(e, r, t, n) {
    const i = r.product_identifier;
    if (i in t)
      return Pl(
        e,
        r,
        t[i]
      );
    if (i in n)
      return Tl(
        e,
        r,
        n[i]
      );
    throw new z(
      Q.CustomerInfoError,
      "Could not find entitlement product in subscriptions or non-subscriptions."
    );
  }
  function Pl(e, r, t) {
    return {
      identifier: e,
      isActive: Il(r),
      willRenew: kl(r, t),
      store: (t == null ? void 0 : t.store) ?? "unknown",
      latestPurchaseDate: new Date(r.purchase_date),
      originalPurchaseDate: new Date(r.purchase_date),
      expirationDate: Sr(r.expires_date),
      productIdentifier: r.product_identifier,
      unsubscribeDetectedAt: Sr(
        t == null ? void 0 : t.unsubscribe_detected_at
      ),
      billingIssueDetectedAt: Sr(
        t == null ? void 0 : t.billing_issues_detected_at
      ),
      isSandbox: (t == null ? void 0 : t.is_sandbox) ?? false,
      periodType: (t == null ? void 0 : t.period_type) ?? "normal"
    };
  }
  function Tl(e, r, t) {
    return {
      identifier: e,
      isActive: true,
      willRenew: false,
      store: t.store,
      latestPurchaseDate: new Date(r.purchase_date),
      originalPurchaseDate: new Date(
        t.original_purchase_date
      ),
      expirationDate: null,
      productIdentifier: r.product_identifier,
      unsubscribeDetectedAt: null,
      billingIssueDetectedAt: null,
      isSandbox: t.is_sandbox,
      periodType: "normal"
    };
  }
  function Al(e, r, t) {
    const n = {}, i = {};
    for (const o in e) {
      const a = xl(
        o,
        e[o],
        r,
        t
      );
      n[o] = a, a.isActive && (i[o] = a);
    }
    return {
      all: n,
      active: i
    };
  }
  function Sr(e) {
    return e == null ? null : new Date(e);
  }
  function Ol(e) {
    const r = Rl(e), t = e.subscriber, n = Ul(
      t.non_subscriptions
    );
    return {
      entitlements: Al(
        t.entitlements,
        t.subscriptions,
        n
      ),
      allExpirationDatesByProduct: r,
      allPurchaseDatesByProduct: Nl(
        e,
        n
      ),
      activeSubscriptions: Sl(r),
      managementURL: t.management_url,
      requestDate: new Date(e.request_date),
      firstSeenDate: new Date(t.first_seen),
      originalPurchaseDate: Sr(
        t.original_purchase_date
      ),
      originalAppUserId: e.subscriber.original_app_user_id
    };
  }
  function kl(e, r) {
    if (r == null) return false;
    const t = r.store == "promotional", n = e.expires_date == null, i = r.unsubscribe_detected_at != null, o = r.billing_issues_detected_at != null;
    return !(t || n || i || o);
  }
  function Nl(e, r) {
    const t = {};
    for (const n in e.subscriber.subscriptions) {
      const i = e.subscriber.subscriptions[n];
      t[n] = new Date(
        i.purchase_date
      );
    }
    for (const n in r) {
      const i = r[n].purchase_date;
      i == null ? t[n] = null : t[n] = new Date(i);
    }
    return t;
  }
  function Rl(e) {
    const r = {};
    for (const t in e.subscriber.subscriptions) {
      const n = e.subscriber.subscriptions[t];
      n.expires_date == null ? r[t] = null : r[t] = new Date(
        n.expires_date
      );
    }
    return r;
  }
  function Sl(e) {
    const r = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Date();
    for (const n in e) {
      const i = e[n];
      (i == null || i > t) && r.add(n);
    }
    return r;
  }
  function Ul(e) {
    const r = {};
    for (const t in e) {
      if (e[t].length === 0) continue;
      const n = e[t].length;
      r[t] = e[t][n - 1];
    }
    return r;
  }
  var Ll = "0.12.1";
  var $l = "https://api.revenuecat.com";
  var Br;
  (function(e) {
    e[e.CONTINUE = 100] = "CONTINUE", e[e.SWITCHING_PROTOCOLS = 101] = "SWITCHING_PROTOCOLS", e[e.PROCESSING = 102] = "PROCESSING", e[e.EARLY_HINTS = 103] = "EARLY_HINTS", e[e.OK = 200] = "OK", e[e.CREATED = 201] = "CREATED", e[e.ACCEPTED = 202] = "ACCEPTED", e[e.NON_AUTHORITATIVE_INFORMATION = 203] = "NON_AUTHORITATIVE_INFORMATION", e[e.NO_CONTENT = 204] = "NO_CONTENT", e[e.RESET_CONTENT = 205] = "RESET_CONTENT", e[e.PARTIAL_CONTENT = 206] = "PARTIAL_CONTENT", e[e.MULTI_STATUS = 207] = "MULTI_STATUS", e[e.MULTIPLE_CHOICES = 300] = "MULTIPLE_CHOICES", e[e.MOVED_PERMANENTLY = 301] = "MOVED_PERMANENTLY", e[e.MOVED_TEMPORARILY = 302] = "MOVED_TEMPORARILY", e[e.SEE_OTHER = 303] = "SEE_OTHER", e[e.NOT_MODIFIED = 304] = "NOT_MODIFIED", e[e.USE_PROXY = 305] = "USE_PROXY", e[e.TEMPORARY_REDIRECT = 307] = "TEMPORARY_REDIRECT", e[e.PERMANENT_REDIRECT = 308] = "PERMANENT_REDIRECT", e[e.BAD_REQUEST = 400] = "BAD_REQUEST", e[e.UNAUTHORIZED = 401] = "UNAUTHORIZED", e[e.PAYMENT_REQUIRED = 402] = "PAYMENT_REQUIRED", e[e.FORBIDDEN = 403] = "FORBIDDEN", e[e.NOT_FOUND = 404] = "NOT_FOUND", e[e.METHOD_NOT_ALLOWED = 405] = "METHOD_NOT_ALLOWED", e[e.NOT_ACCEPTABLE = 406] = "NOT_ACCEPTABLE", e[e.PROXY_AUTHENTICATION_REQUIRED = 407] = "PROXY_AUTHENTICATION_REQUIRED", e[e.REQUEST_TIMEOUT = 408] = "REQUEST_TIMEOUT", e[e.CONFLICT = 409] = "CONFLICT", e[e.GONE = 410] = "GONE", e[e.LENGTH_REQUIRED = 411] = "LENGTH_REQUIRED", e[e.PRECONDITION_FAILED = 412] = "PRECONDITION_FAILED", e[e.REQUEST_TOO_LONG = 413] = "REQUEST_TOO_LONG", e[e.REQUEST_URI_TOO_LONG = 414] = "REQUEST_URI_TOO_LONG", e[e.UNSUPPORTED_MEDIA_TYPE = 415] = "UNSUPPORTED_MEDIA_TYPE", e[e.REQUESTED_RANGE_NOT_SATISFIABLE = 416] = "REQUESTED_RANGE_NOT_SATISFIABLE", e[e.EXPECTATION_FAILED = 417] = "EXPECTATION_FAILED", e[e.IM_A_TEAPOT = 418] = "IM_A_TEAPOT", e[e.INSUFFICIENT_SPACE_ON_RESOURCE = 419] = "INSUFFICIENT_SPACE_ON_RESOURCE", e[e.METHOD_FAILURE = 420] = "METHOD_FAILURE", e[e.MISDIRECTED_REQUEST = 421] = "MISDIRECTED_REQUEST", e[e.UNPROCESSABLE_ENTITY = 422] = "UNPROCESSABLE_ENTITY", e[e.LOCKED = 423] = "LOCKED", e[e.FAILED_DEPENDENCY = 424] = "FAILED_DEPENDENCY", e[e.UPGRADE_REQUIRED = 426] = "UPGRADE_REQUIRED", e[e.PRECONDITION_REQUIRED = 428] = "PRECONDITION_REQUIRED", e[e.TOO_MANY_REQUESTS = 429] = "TOO_MANY_REQUESTS", e[e.REQUEST_HEADER_FIELDS_TOO_LARGE = 431] = "REQUEST_HEADER_FIELDS_TOO_LARGE", e[e.UNAVAILABLE_FOR_LEGAL_REASONS = 451] = "UNAVAILABLE_FOR_LEGAL_REASONS", e[e.INTERNAL_SERVER_ERROR = 500] = "INTERNAL_SERVER_ERROR", e[e.NOT_IMPLEMENTED = 501] = "NOT_IMPLEMENTED", e[e.BAD_GATEWAY = 502] = "BAD_GATEWAY", e[e.SERVICE_UNAVAILABLE = 503] = "SERVICE_UNAVAILABLE", e[e.GATEWAY_TIMEOUT = 504] = "GATEWAY_TIMEOUT", e[e.HTTP_VERSION_NOT_SUPPORTED = 505] = "HTTP_VERSION_NOT_SUPPORTED", e[e.INSUFFICIENT_STORAGE = 507] = "INSUFFICIENT_STORAGE", e[e.NETWORK_AUTHENTICATION_REQUIRED = 511] = "NETWORK_AUTHENTICATION_REQUIRED";
  })(Br || (Br = {}));
  function ft(e) {
    return e ? e.startsWith("rcb_sb_") : false;
  }
  async function He(e, r) {
    const { apiKey: t, body: n, headers: i, httpConfig: o } = r, s = `${(o == null ? void 0 : o.proxyURL) ?? $l}${e.urlPath()}`;
    try {
      const u = await fetch(s, {
        method: e.method,
        headers: Fl(t, i, o == null ? void 0 : o.additionalHeaders),
        body: Ml(n)
      });
      return await Dl(u, e), await u.json();
    } catch (u) {
      throw u instanceof TypeError ? new z(
        Q.NetworkError,
        pr.getPublicMessage(Q.NetworkError),
        u.message
      ) : u;
    }
  }
  async function Dl(e, r) {
    const t = e.status;
    if (t >= Br.INTERNAL_SERVER_ERROR)
      Jr(r, t, await e.text());
    else if (t >= Br.BAD_REQUEST) {
      const n = await e.json(), i = n ? JSON.stringify(n) : null, o = n == null ? void 0 : n.code, a = n == null ? void 0 : n.message;
      if (o != null) {
        const s = pr.convertCodeToBackendErrorCode(o);
        if (s == null)
          Jr(
            r,
            t,
            i,
            o
          );
        else
          throw z.getForBackendError(
            s,
            a
          );
      } else
        Jr(r, t, i);
    }
  }
  function Jr(e, r, t, n) {
    throw new z(
      Q.UnknownBackendError,
      "Unknown backend error.",
      `Request: ${e.name}. Status code: ${r}. Body: ${t}.`,
      { backendErrorCode: n }
    );
  }
  function Ml(e) {
    return e == null ? null : JSON.stringify(e);
  }
  var ni = "Authorization";
  var ii = "Content-Type";
  var oi = "Accept";
  var ai = "X-Platform";
  var si = "X-Version";
  var li = "X-Is-Sandbox";
  var Bl = /* @__PURE__ */ new Set([
    ni,
    ii,
    oi,
    ai,
    si,
    li
  ]);
  function Fl(e, r, t) {
    let n = {
      [ni]: `Bearer ${e}`,
      [ii]: "application/json",
      [oi]: "application/json",
      [ai]: "web",
      [si]: Ll,
      [li]: `${ft(e)}`
    };
    return r && (n = { ...n, ...r }), t && (n = { ...t, ...n }), n;
  }
  var ci = "/v1/subscribers";
  var zr = "/rcbilling/v1";
  var ql = class {
    constructor(r) {
      N(this, "appUserId");
      N(this, "method", "GET");
      N(this, "name", "getOfferings");
      this.appUserId = r;
    }
    urlPath() {
      const r = encodeURIComponent(this.appUserId);
      return `${ci}/${r}/offerings`;
    }
  };
  var Cl = class {
    constructor() {
      N(this, "method", "POST");
      N(this, "name", "purchase");
    }
    urlPath() {
      return `${zr}/purchase`;
    }
  };
  var jl = class {
    constructor(r, t, n) {
      N(this, "method", "GET");
      N(this, "name", "getProducts");
      N(this, "appUserId");
      N(this, "productIds");
      N(this, "currency");
      this.appUserId = r, this.productIds = t, this.currency = n;
    }
    urlPath() {
      const r = encodeURIComponent(this.appUserId), t = this.productIds.map(encodeURIComponent).join("&id="), n = this.currency ? `&currency=${this.currency}` : "";
      return `${zr}/subscribers/${r}/products?id=${t}${n}`;
    }
  };
  var Hl = class {
    constructor(r) {
      N(this, "method", "GET");
      N(this, "name", "getCustomerInfo");
      N(this, "appUserId");
      this.appUserId = r;
    }
    urlPath() {
      const r = encodeURIComponent(this.appUserId);
      return `${ci}/${r}`;
    }
  };
  var Vl = class {
    constructor() {
      N(this, "method", "GET");
      N(this, "name", "getBrandingInfo");
    }
    urlPath() {
      return `${zr}/branding`;
    }
  };
  var Gl = class {
    constructor(r) {
      N(this, "method", "GET");
      N(this, "name", "getCheckoutStatus");
      N(this, "operationSessionId");
      this.operationSessionId = r;
    }
    urlPath() {
      return `${zr}/checkout/${this.operationSessionId}`;
    }
  };
  var dt = {};
  var Yl = class {
    constructor(r, t = dt) {
      N(this, "API_KEY");
      N(this, "httpConfig");
      this.API_KEY = r, this.httpConfig = t;
    }
    async getOfferings(r) {
      return await He(
        new ql(r),
        {
          apiKey: this.API_KEY,
          httpConfig: this.httpConfig
        }
      );
    }
    async getCustomerInfo(r) {
      return await He(
        new Hl(r),
        {
          apiKey: this.API_KEY,
          httpConfig: this.httpConfig
        }
      );
    }
    async getProducts(r, t, n) {
      return await He(
        new jl(r, t, n),
        {
          apiKey: this.API_KEY,
          httpConfig: this.httpConfig
        }
      );
    }
    async getBrandingInfo() {
      return await He(
        new Vl(),
        {
          apiKey: this.API_KEY,
          httpConfig: this.httpConfig
        }
      );
    }
    async postPurchase(r, t, n, i, o) {
      const a = {
        app_user_id: r,
        product_id: t,
        email: n,
        price_id: o.priceId,
        presented_offering_identifier: i.offeringIdentifier
      };
      return o.id !== "base_option" && (a.offer_id = o.id), i.targetingContext && (a.applied_targeting_rule = {
        rule_id: i.targetingContext.ruleId,
        revision: i.targetingContext.revision
      }), i.placementIdentifier && (a.presented_placement_identifier = i.placementIdentifier), await He(
        new Cl(),
        {
          apiKey: this.API_KEY,
          body: a,
          httpConfig: this.httpConfig
        }
      );
    }
    async getCheckoutStatus(r) {
      return await He(
        new Gl(r),
        {
          apiKey: this.API_KEY,
          httpConfig: this.httpConfig
        }
      );
    }
  };
  function Wl(e) {
    if (!/^rcb_[a-zA-Z0-9_.-]+$/.test(e))
      throw new z(
        Q.InvalidCredentialsError,
        "Invalid API key. Use your RevenueCat Billing API key."
      );
  }
  function zl(e) {
    if ((/* @__PURE__ */ new Set([
      "no_user",
      "null",
      "none",
      "nil",
      "(null)",
      "NaN",
      "\\x00",
      "",
      "unidentified",
      "undefined",
      "unknown"
    ])).has(e) || e.includes("/"))
      throw new z(
        Q.InvalidAppUserIdError,
        'Provided user id: "' + e + '" is not valid. See https://www.revenuecat.com/docs/customers/user-ids#tips-for-setting-app-user-ids for more information.'
      );
  }
  function Kl(e) {
    if (e != null && e.endsWith("/"))
      throw new z(
        Q.ConfigurationError,
        "Invalid proxy URL. The proxy URL should not end with a trailing slash."
      );
  }
  function Ql(e) {
    if (e) {
      for (const r in e)
        if (Bl.has(r))
          throw new z(
            Q.ConfigurationError,
            "Invalid additional headers. Some headers are reserved for internal use."
          );
    }
  }
  var ui = /* @__PURE__ */ ((e) => (e.Current = "current", e))(ui || {});
  function Zl(e, r) {
    async function t(...n) {
      return await this.preload(), await e.call(this, ...n);
    }
    return t;
  }
  var fi = (e, r) => ({
    ...e,
    rcBillingProduct: {
      ...e.rcBillingProduct,
      presentedOfferingContext: {
        ...e.rcBillingProduct.presentedOfferingContext,
        placementIdentifier: r
      }
    }
  });
  var Le = (e, r) => e == null ? null : fi(e, r);
  var Xl = (e, r, t) => {
    const n = e.offering_ids_by_placement ?? null;
    if (n == null)
      return null;
    const i = e.fallback_offering_id ?? null;
    let o;
    if (t in n) {
      const s = n[t] ?? null;
      if (s == null)
        return null;
      o = r[s], o == null && (o = r[i]);
    } else
      o = r[i];
    if (o == null)
      return null;
    const a = Object.fromEntries(
      Object.entries(o.packagesById).map(([s, u]) => [
        s,
        fi(u, t)
      ])
    );
    return {
      ...o,
      packagesById: a,
      availablePackages: Object.values(a),
      weekly: Le(o.weekly, t),
      monthly: Le(
        o.monthly,
        t
      ),
      twoMonth: Le(
        o.twoMonth,
        t
      ),
      threeMonth: Le(
        o.threeMonth,
        t
      ),
      sixMonth: Le(
        o.sixMonth,
        t
      ),
      annual: Le(o.annual, t),
      lifetime: Le(
        o.lifetime,
        t
      )
    };
  };
  function Jl(e, r) {
    const t = {};
    r.product_details.forEach((o) => {
      t[o.identifier] = o;
    });
    const n = {};
    e.offerings.forEach((o) => {
      const a = o.identifier === e.current_offering_id, s = Xo(
        a,
        o,
        t,
        e.targeting
      );
      s != null && (n[o.identifier] = s);
    });
    const i = e.current_offering_id ? n[e.current_offering_id] ?? null : null;
    return Object.keys(n).length == 0 && F.debugLog(
      "Empty offerings. Please make sure you've configured offerings correctly in the RevenueCat dashboard and that the products are properly configured."
    ), {
      all: n,
      current: i
    };
  }
  var an;
  var et;
  an = [Zl];
  var ee = class ee2 {
    /** @internal */
    constructor(r, t, n = dt) {
      $t(et, 5, this);
      N(this, "_API_KEY");
      N(this, "_appUserId");
      N(this, "_brandingInfo", null);
      N(this, "_loadingResourcesPromise", null);
      N(this, "backend");
      N(this, "purchaseOperationHelper");
      this._API_KEY = r, this._appUserId = t, ft(r) && F.debugLog("Initializing Purchases SDK with sandbox API Key"), this.backend = new Yl(this._API_KEY, n), this.purchaseOperationHelper = new _a(this.backend);
    }
    /**
     * Set the log level. Logs of the given level and below will be printed
     * in the console.
     * Default is `LogLevel.Silent` so no logs will be printed in the console.
     * @param logLevel - LogLevel to set.
     */
    static setLogLevel(r) {
      F.setLogLevel(r);
    }
    /**
     * Get the singleton instance of Purchases. It's preferred to use the instance
     * obtained from the {@link Purchases.configure} method when possible.
     * @throws {@link UninitializedPurchasesError} if the instance has not been initialized yet.
     */
    static getSharedInstance() {
      if (ee2.isConfigured())
        return ee2.instance;
      throw new pa();
    }
    /**
     * Returns whether the Purchases SDK is configured or not.
     */
    static isConfigured() {
      return ee2.instance !== void 0;
    }
    /**
     * Configures the Purchases SDK. This should be called as soon as your app
     * has a unique user id for your user. You should only call this once, and
     * keep the returned instance around for use throughout your application.
     * @param apiKey - RevenueCat API Key. Can be obtained from the RevenueCat dashboard.
     * @param appUserId - Your unique id for identifying the user.
     * @param httpConfig - Advanced http configuration to customise the SDK usage {@link HttpConfig}.
     * @throws {@link PurchasesError} if the API key or user id are invalid.
     */
    static configure(r, t, n = dt) {
      return ee2.instance !== void 0 && F.warnLog(
        "Purchases is already initialized. You normally should only configure Purchases once. Creating and returning new instance."
      ), Wl(r), zl(t), Kl(n.proxyURL), Ql(n.additionalHeaders), ee2.instance = new ee2(r, t, n), ee2.getSharedInstance();
    }
    /**
     * Loads and caches some optional data in the Purchases SDK.
     * Currently only fetching branding information. You can call this method
     * after configuring the SDK to speed up the first call to
     * {@link Purchases.purchase}.
     */
    async preload() {
      if (this.hasLoadedResources()) {
        F.verboseLog("Purchases resources are loaded. Skipping.");
        return;
      }
      if (this._loadingResourcesPromise !== null) {
        F.verboseLog("Purchases resources are loading. Waiting."), await this._loadingResourcesPromise;
        return;
      }
      return this._loadingResourcesPromise = this.backend.getBrandingInfo().then((r) => {
        this._brandingInfo = r;
      }).catch((r) => {
        let t = `${r}`;
        r instanceof z && (t = `${r.message}. ${r.underlyingErrorMessage ? `Underlying error: ${r.underlyingErrorMessage}` : ""}`), F.errorLog(`Error fetching branding info: ${t}`);
      }).finally(() => {
        this._loadingResourcesPromise = null;
      }), this._loadingResourcesPromise;
    }
    hasLoadedResources() {
      return this._brandingInfo !== null;
    }
    /**
     * Fetch the configured offerings for this user. You can configure these
     * in the RevenueCat dashboard.
     * @param params - The parameters object to customise the offerings fetch. Check {@link GetOfferingsParams}
     */
    async getOfferings(r) {
      qs(r == null ? void 0 : r.currency);
      const t = this._appUserId, n = await this.backend.getOfferings(t), i = (r == null ? void 0 : r.offeringIdentifier) === ui.Current ? n.current_offering_id : r == null ? void 0 : r.offeringIdentifier;
      return i && (n.offerings = n.offerings.filter(
        (o) => o.identifier === i
      )), await this.getAllOfferings(n, t, r);
    }
    /**
     * Retrieves a specific offering by a placement identifier.
     * For more info see https://www.revenuecat.com/docs/tools/targeting
     * @param placementIdentifier - The placement identifier to retrieve the offering for.
     * @param params - The parameters object to customise the offerings fetch. Check {@link GetOfferingsParams}
     */
    async getCurrentOfferingForPlacement(r, t) {
      const n = this._appUserId, i = await this.backend.getOfferings(n), o = await this.getAllOfferings(
        i,
        n,
        t
      ), a = i.placements ?? null;
      return a == null ? null : Xl(
        a,
        o.all,
        r
      );
    }
    async getAllOfferings(r, t, n) {
      const i = r.offerings.flatMap((a) => a.packages).map((a) => a.platform_product_identifier), o = await this.backend.getProducts(
        t,
        i,
        n == null ? void 0 : n.currency
      );
      return this.logMissingProductIds(i, o.product_details), Jl(r, o);
    }
    /**
     * Convenience method to check whether a user is entitled to a specific
     * entitlement. This will use {@link Purchases.getCustomerInfo} under the hood.
     * @param entitlementIdentifier - The entitlement identifier you want to check.
     * @returns Whether the user is entitled to the specified entitlement
     * @throws {@link PurchasesError} if there is an error while fetching the customer info.
     * @see {@link Purchases.getCustomerInfo}
     */
    async isEntitledTo(r) {
      const t = await this.getCustomerInfo();
      return r in t.entitlements.active;
    }
    /**
     * Method to perform a purchase for a given package. You can obtain the
     * package from {@link Purchases.getOfferings}. This method will present the purchase
     * form on your site, using the given HTML element as the mount point, if
     * provided, or as a modal if not.
     * @deprecated - please use .purchase
     * @param rcPackage - The package you want to purchase. Obtained from {@link Purchases.getOfferings}.
     * @param customerEmail - The email of the user. If undefined, RevenueCat will ask the customer for their email.
     * @param htmlTarget - The HTML element where the billing view should be added. If undefined, a new div will be created at the root of the page and appended to the body.
     * @returns a Promise for the customer info after the purchase is completed successfully.
     * @throws {@link PurchasesError} if there is an error while performing the purchase. If the {@link PurchasesError.errorCode} is {@link ErrorCode.UserCancelledError}, the user cancelled the purchase.
     */
    purchasePackage(r, t, n) {
      return this.purchase({
        rcPackage: r,
        customerEmail: t,
        htmlTarget: n
      });
    }
    purchase(r) {
      const { rcPackage: t, purchaseOption: n, htmlTarget: i, customerEmail: o } = r;
      let a = i ?? document.getElementById("rcb-ui-root");
      if (a === null) {
        const f = document.createElement("div");
        f.className = "rcb-ui-root", document.body.appendChild(f), a = f;
      }
      if (a === null)
        throw new Error(
          "Could not generate a mount point for the billing widget"
        );
      const s = a, u = !i, l = this._appUserId;
      return F.debugLog(
        `Presenting purchase form for package ${t.identifier}`
      ), new Promise((f, c) => {
        Ao(wl, {
          target: s,
          props: {
            appUserId: l,
            rcPackage: t,
            purchaseOption: n,
            customerEmail: o,
            onFinished: async (d) => {
              F.debugLog("Purchase finished"), s.innerHTML = "";
              const p = {
                customerInfo: await this._getCustomerInfoForUserId(l),
                redemptionInfo: d
              };
              f(p);
            },
            onClose: () => {
              s.innerHTML = "", F.debugLog("Purchase cancelled by user"), c(new z(Q.UserCancelledError));
            },
            onError: (d) => {
              s.innerHTML = "", c(z.getForPurchasesFlowError(d));
            },
            purchases: this,
            brandingInfo: this._brandingInfo,
            purchaseOperationHelper: this.purchaseOperationHelper,
            asModal: u
          }
        });
      });
    }
    /**
     * Gets latest available {@link CustomerInfo}.
     * @returns The latest {@link CustomerInfo}.
     * @throws {@link PurchasesError} if there is an error while fetching the customer info.
     */
    async getCustomerInfo() {
      return await this._getCustomerInfoForUserId(this._appUserId);
    }
    /**
     * Gets the current app user id.
     */
    getAppUserId() {
      return this._appUserId;
    }
    /**
     * Change the current app user id. Returns the customer info for the new
     * user id.
     * @param newAppUserId - The user id to change to.
     */
    async changeUser(r) {
      return this._appUserId = r, await this.getCustomerInfo();
    }
    /** @internal */
    logMissingProductIds(r, t) {
      const n = {};
      t.forEach(
        (o) => n[o.identifier] = o
      );
      const i = [];
      r.forEach((o) => {
        n[o] === void 0 && i.push(o);
      }), i.length > 0 && F.debugLog(
        `Could not find product data for product ids:
        ${i.join()}.
        Please check that your product configuration is correct.`
      );
    }
    /**
     * @returns Whether the SDK is using a sandbox API Key.
     */
    isSandbox() {
      return ft(this._API_KEY);
    }
    /**
     * Closes the Purchases instance. You should never have to do this normally.
     */
    close() {
      ee2.instance === this ? ee2.instance = void 0 : F.warnLog(
        "Trying to close a Purchases instance that is not the current instance. Ignoring."
      );
    }
    /** @internal */
    async _getCustomerInfoForUserId(r) {
      const t = await this.backend.getCustomerInfo(r);
      return Ol(t);
    }
  };
  et = Ut(null), Dt(et, 1, "purchase", an, ee), Zr(et, ee), /** @internal */
  N(ee, "instance");
  var on = ee;

  // web-src/revenuecat-paywall.js
  var API_KEY = "rcb_sb_RxDiRUgSVZVzSHkACLkcJHwVi";
  var DEFAULT_ENTITLEMENT_ID = "reclip_pro";
  var DEFAULT_OFFERING_ID = "ReClip Pro";
  var FALLBACK_CUSTOMER_ID_KEY = "reclip_rc_customer_id";
  var sharedPurchasesPromise = null;
  function getFallbackCustomerId() {
    let customerId = window.localStorage.getItem(FALLBACK_CUSTOMER_ID_KEY);
    if (!customerId) {
      const generatedId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `reclip-web-${Date.now()}`;
      customerId = `reclip-${generatedId}`;
      window.localStorage.setItem(FALLBACK_CUSTOMER_ID_KEY, customerId);
    }
    return customerId;
  }
  function getNativeCustomerId() {
    if (typeof window.ReClip === "undefined") return null;
    if (typeof window.ReClip.getRevenueCatAppUserId !== "function") return null;
    try {
      return window.ReClip.getRevenueCatAppUserId() || null;
    } catch (error) {
      console.warn("Unable to read RevenueCat app user ID from native bridge", error);
      return null;
    }
  }
  async function getOrCreateCustomerId() {
    return getNativeCustomerId() || getFallbackCustomerId();
  }
  async function getPurchases() {
    if (!sharedPurchasesPromise) {
      sharedPurchasesPromise = getOrCreateCustomerId().then(
        (appUserId) => on.configure(API_KEY, appUserId)
      );
    }
    return sharedPurchasesPromise;
  }
  async function getOffering(purchases, preferredOfferingId) {
    const offerings = await purchases.getOfferings();
    if (preferredOfferingId && offerings.all[preferredOfferingId]) {
      return offerings.all[preferredOfferingId];
    }
    return offerings.current;
  }
  async function getCustomerInfoWithFallback(purchases) {
    try {
      return await purchases.getCustomerInfo();
    } catch (error) {
      console.warn("Unable to fetch latest RevenueCat customer info", error);
      return null;
    }
  }
  function hasEntitlement(customerInfo, entitlementId) {
    if (!customerInfo || !customerInfo.entitlements) return false;
    const active = customerInfo.entitlements.active || {};
    return Object.prototype.hasOwnProperty.call(active, entitlementId);
  }
  async function presentManagedPaywall({
    containerId = "paywall-container",
    entitlementId = DEFAULT_ENTITLEMENT_ID,
    offeringId = DEFAULT_OFFERING_ID,
    onBeforePresent,
    onAfterClose
  } = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Missing paywall container: #${containerId}`);
    }
    if (typeof onBeforePresent === "function") {
      onBeforePresent();
    }
    container.innerHTML = "";
    const purchases = await getPurchases();
    const offering = await getOffering(purchases, offeringId);
    if (!offering) {
      throw new Error("No RevenueCat offering available for the paywall");
    }
    let purchaseResult = null;
    try {
      purchaseResult = await purchases.presentPaywall({
        htmlTarget: container,
        offering
      });
    } finally {
      if (typeof onAfterClose === "function") {
        onAfterClose();
      }
    }
    const customerInfo = purchaseResult?.customerInfo || await getCustomerInfoWithFallback(purchases);
    return {
      purchaseResult,
      customerInfo,
      unlocked: hasEntitlement(customerInfo, entitlementId)
    };
  }
  window.ReclipRevenueCatPaywall = {
    getPurchases,
    getOrCreateCustomerId,
    presentManagedPaywall,
    hasEntitlement
  };
})();
