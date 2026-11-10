/* Krákhamar: the fjord.
   One WebGL pass draws the real photograph, ripples only the water in it, stands the wordmark on the
   waterline and mirrors it in the fjord. Scene changes wipe outward from the waterline. Ripple approach informed by 21st.dev WaterRippleImage
   (#8715); the shader itself is written for this page. */
(function () {
  var VERT = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(.5*(p.x+1.),1.-.5*(p.y+1.));gl_Position=vec4(p,0.,1.);}';

  var FRAG = [
    'precision highp float;varying vec2 v;',
    'uniform sampler2D tA,tB,tT;uniform vec4 fA,fB,bA,bB;',
    'uniform float wl,time,mixv,lift,asp,capN;uniform float e[13];',
    'vec2 wv(vec2 u,float d,float t){float y=2.2/(d+.11);float x=u.x*asp;',
    ' float a=sin(y*2.3+t*.8+sin(x*2.3+t*.21)*1.2)*.52+sin(y*4.1-t*1.1+x*5.)*.26+sin(y*1.2+t*.45+x*9.)*.22;',
    ' return vec2(a,cos(y*2.6+t*.6+x*3.)*.18);}',
    'vec3 scene(sampler2D s,vec4 f,vec4 b,vec2 u){',
    ' float de=u.y-wl;vec2 q=u;',
    ' if(de>0.){float m=smoothstep(0.,.012,de)*(1.-smoothstep(b.x-.03,b.x,u.y));q+=wv(u,de,time)*vec2(.0016+de*.016,.0006+de*.006)*m*b.z;}',
    ' vec3 c=texture2D(s,q*f.xy+f.zw).rgb;',
    ' return c*b.w;}',
    'float li(float x){int i=0;for(int k=0;k<12;k++){if(x>=e[k])i=k;}',
    ' float k=clamp((lift-float(i)*.07)/.85,0.,1.);k=1.-k;return 1.-k*k*k*k;}',
    'void main(){vec2 u=v;float d=u.y-wl;',
    ' vec3 c=scene(tA,fA,bA,u);float sh=bA.x,re=bA.y,rp=bA.z;',
    ' if(mixv>0.){float tt=abs(u.y-wl)/max(wl,1.-wl)+sin(u.x*asp*9.+time*.3)*.04;float ed=mixv*1.3-.3;float k=1.-smoothstep(ed,ed+.2,tt);',
    '  c=mix(c,scene(tB,fB,bB,u),k);sh=mix(sh,bB.x,k);re=mix(re,bB.y,k);rp=mix(rp,bB.z,k);}',
    ' c*=(1.-.3*(1.-smoothstep(0.,.24,u.y)))*(1.-.3*smoothstep(.84,1.,u.y));',
    ' float a=0.,l=li(u.x);',
    ' if(d<=0.){float yy=u.y+(1.-l)*capN;a=texture2D(tT,vec2(u.x,yy)).r;',
    '  float g=0.;if(d>-capN-.07){',
    '  for(int j=0;j<12;j++){float an=float(j)*.5236+.26;for(int r=1;r<4;r++){float ry=float(r)*.014;g+=texture2D(tT,vec2(u.x+cos(an)*ry/asp,yy+sin(an)*ry+.006)).r/float(r);}}}',
    '  c*=1.-.26*smoothstep(0.,1.,g/11.)*l*(1.-a);}',
    ' else{float mk=1.-smoothstep(sh-.02,sh,u.y);',
    '  vec2 w=wv(u,d,time)*vec2(.0016+d*.012,.0005+d*.004)*(.3+.7*rp);float my=wl-d/.66+w.y;float yo=(1.-l)*capN;float bl=.0012+d*.012;',
    '  a=(texture2D(tT,vec2(u.x+w.x,my+yo)).r*.4+texture2D(tT,vec2(u.x+w.x,my+yo-bl)).r*.3+texture2D(tT,vec2(u.x+w.x,my+yo+bl)).r*.3)*re*mk*(1.-smoothstep(0.,capN*.92,d));',
    ' }',
    ' c=mix(c,vec3(.945,.933,.906),a);',
    ' gl_FragColor=vec4(c,1.);}'
  ].join('\n');

  function sh(gl, t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }

  window.createWater = function (canvas, opts) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return null;
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl, gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl, gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['tA', 'tB', 'tT', 'fA', 'fB', 'bA', 'bB', 'wl', 'time', 'mixv', 'lift', 'asp', 'capN'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    U.e = gl.getUniformLocation(pr, 'e');
    gl.uniform1i(U.tA, 0); gl.uniform1i(U.tB, 1); gl.uniform1i(U.tT, 2);

    var scenes = opts.scenes, phone = window.matchMedia('(max-width: 760px)').matches;
    var S = { lift: 0, mixv: 0 };
    var cur = null, next = null, W = 0, H = 0, wl = 0.8, dirty = true, running = false, raf = 0, t0 = performance.now();
    var textTex = gl.createTexture();
    function texParams() { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); }

    function fit(sc) {
      var iw = sc.img.naturalWidth, ih = sc.img.naturalHeight;
      var s = Math.max(W / iw, wl * H / (sc.h * ih), (1 - wl) * H / ((1 - sc.h) * ih));
      var sx = W / (iw * s), sy = H / (ih * s), ox = (1 - sx) * (sc.fx === undefined ? 0.5 : sc.fx), oy = sc.h - wl * sy;
      return [sx, sy, ox, oy, s, iw, ih];
    }
    function band(sc, f) { var y = (sc.shore - f[3]) / f[1]; return [y, sc.refl, sc.rip, sc.dim || 1]; }

    function drawText() {
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d'), word = Array.from(opts.word || 'KRÁKHAMAR');
      var target = W * (W / H < 0.9 ? 0.9 : 0.66), track = opts.track === undefined ? -0.025 : opts.track;
      var face = opts.font || '400 {s}px "Archivo Narrow", sans-serif';
      x.font = face.replace('{s}', 100);
      var total = 0, adv = [];
      for (var i = 0; i < word.length; i++) { var w = x.measureText(word[i]).width + track * 100; adv.push(w); total += w; }
      var size = Math.min(target / total * 100, H * 0.3);
      x.font = face.replace('{s}', size);
      var scale = size / 100, px = (W - total * scale) / 2, base = wl * H, edges = [];
      x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
      for (i = 0; i < word.length; i++) { edges.push(px / W); x.fillText(word[i], px, base); px += adv[i] * scale; }
      while (edges.length < 13) edges.push(1.1);
      gl.uniform1fv(U.e, new Float32Array(edges));
      var cap = x.measureText('Á').actualBoundingBoxAscent || size * 0.95;
      gl.uniform1f(U.capN, (cap + size * 0.08) / H);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, textTex); texParams();
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      S.wordmark = { left: edges[0] * W, right: px, base: base, size: size };
    }

    function bindScene(unit, sc) { gl.activeTexture(unit); gl.bindTexture(gl.TEXTURE_2D, sc.tex); }
    function pushFit(uF, uB, sc) { var f = fit(sc); gl.uniform4f(uF, f[0], f[1], f[2], f[3]); gl.uniform4fv(uB, band(sc, f)); }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, phone ? 2 : 1.75);
      var r = canvas.parentNode.getBoundingClientRect();
      var nw = Math.round(r.width * dpr), nh = Math.round(r.height * dpr);
      if (nw === W && nh === H) return false;
      W = nw; H = nh; canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H);
      wl = (W / H < 0.9) ? 0.635 : (W / H > 2 ? 0.8 : 0.805);
      gl.uniform1f(U.wl, wl); gl.uniform1f(U.asp, W / H);
      drawText();
      if (cur) pushFit(U.fA, U.bA, cur);
      if (next) pushFit(U.fB, U.bB, next);
      dirty = true;
      return true;
    }

    function load(sc) {
      if (sc.ready) return sc.ready;
      var im = new Image(); im.decoding = 'async'; im.src = sc.src; sc.img = im;
      sc.ready = im.decode().then(function () {
        sc.tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, sc.tex); texParams();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
        return sc;
      });
      return sc.ready;
    }

    function draw(now) {
      gl.uniform1f(U.time, ((now - t0) / 1000));
      gl.uniform1f(U.mixv, S.mixv); gl.uniform1f(U.lift, S.lift);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      dirty = false;
    }
    function loop(now) { if (!running) return; raf = requestAnimationFrame(loop); draw(now); }

    var paused = false;
    var api = {
      state: S,
      pause: function (v) { paused = v; if (v) api.stop(); else api.start(); },
      start: function () { if (paused) return; if (running || opts.still) { if (opts.still) api.render(); return; } running = true; raf = requestAnimationFrame(loop); },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      render: function () { if (cur) draw(performance.now()); },
      resize: function () { if (resize() && !running) api.render(); },
      name: function () { return cur && cur.name; },
      poster: function (el) { var f = fit(cur); var w = f[5] * f[4] / (W / canvas.clientWidth), h = f[6] * f[4] / (H / canvas.clientHeight); el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.left = (-f[2] * w) + 'px'; el.style.top = (-f[3] * h) + 'px'; },
      init: function (name) {
        var sc = scenes[name]; sc.name = name;
        return load(sc).then(function () {
          cur = sc; resize(); bindScene(gl.TEXTURE0, cur); bindScene(gl.TEXTURE1, cur); pushFit(U.fA, U.bA, cur); pushFit(U.fB, U.bB, cur);
          Object.keys(scenes).forEach(function (k) { scenes[k].name = k; });
          draw(performance.now());
          return api;
        });
      },
      preload: function () { Object.keys(scenes).forEach(function (k) { load(scenes[k]); }); },
      /* Retargets from wherever a running wipe is: a new pick during a wipe finishes on the picked scene. */
      to: function (name, gsap, done) {
        var sc = scenes[name];
        if (!sc || sc === next || (sc === cur && !next)) return;
        load(sc).then(function () {
          if (next) { gsap.killTweensOf(S, 'mixv'); cur = S.mixv > 0.5 ? next : cur; bindScene(gl.TEXTURE0, cur); pushFit(U.fA, U.bA, cur); S.mixv = 0; }
          if (sc === cur) { next = null; api.render(); return; }
          next = sc; bindScene(gl.TEXTURE1, sc); pushFit(U.fB, U.bB, sc); S.mixv = 0;
          var finish = function () { cur = sc; next = null; bindScene(gl.TEXTURE0, cur); pushFit(U.fA, U.bA, cur); S.mixv = 0; api.render(); if (done) done(); };
          if (opts.still) { finish(); return; }
          gsap.to(S, { mixv: 1, duration: 1.5, ease: 'power2.inOut', onUpdate: function () { if (!running) api.render(); }, onComplete: finish });
        });
      }
    };
    return api;
  };
})();
