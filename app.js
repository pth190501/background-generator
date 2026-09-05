(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, Number.isFinite(+v) ? +v : min));
  const normalizeHex = (hex, fallback = '#000000') => /^#[0-9a-fA-F]{6}$/.test(String(hex).trim()) ? String(hex).trim().toUpperCase() : fallback;
  const hexToRgb = (hex) => {
    const h = normalizeHex(hex).slice(1);
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  };
  const rgba = (hex, opacity) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 100) / 100})`;
  };
  const swiftColor = (hex, opacity = 100) => {
    const { r, g, b } = hexToRgb(hex);
    return `Color(red: ${(r/255).toFixed(4)}, green: ${(g/255).toFixed(4)}, blue: ${(b/255).toFixed(4)}, opacity: ${(clamp(opacity,0,100)/100).toFixed(3)})`;
  };
  const uiColor = (hex, opacity = 100) => {
    const { r, g, b } = hexToRgb(hex);
    return `UIColor(red: ${(r/255).toFixed(4)}, green: ${(g/255).toFixed(4)}, blue: ${(b/255).toFixed(4)}, alpha: ${(clamp(opacity,0,100)/100).toFixed(3)})`;
  };
  const deepCopy = (value) => JSON.parse(JSON.stringify(value));

  const defaults = {
    width: 640, height: 400, transparentOutside: true,
    gradient: {
      type: 'linear', angle: 135, centerX: 50, centerY: 50,
      stops: [
        { color: '#665BFF', opacity: 100, position: 0 },
        { color: '#B86BFF', opacity: 100, position: 48 },
        { color: '#FF6FAE', opacity: 100, position: 100 }
      ]
    },
    shadow: { enabled: true, x: 0, y: 18, blur: 36, spread: 0, color: '#000000', opacity: 22 },
    radius: { linked: true, tl: 32, tr: 32, bl: 32, br: 32 },
    border: { width: 0, color: '#FFFFFF', opacity: 100 }
  };

  const builtInPresets = {
    'Aurora': defaults,
    'iOS Card': {
      ...deepCopy(defaults),
      gradient: { type: 'linear', angle: 150, centerX: 50, centerY: 50, stops: [
        { color: '#FFFFFF', opacity: 100, position: 0 }, { color: '#E9EEFF', opacity: 100, position: 100 }
      ]},
      shadow: { enabled: true, x: 0, y: 10, blur: 28, spread: 0, color: '#0B1020', opacity: 14 },
      radius: { linked: true, tl: 24, tr: 24, bl: 24, br: 24 },
      border: { width: 1, color: '#FFFFFF', opacity: 60 }
    },
    'Sunset': {
      ...deepCopy(defaults),
      gradient: { type: 'radial', angle: 0, centerX: 28, centerY: 24, stops: [
        { color: '#FFE29F', opacity: 100, position: 0 }, { color: '#FFA99F', opacity: 100, position: 45 }, { color: '#FF719A', opacity: 100, position: 100 }
      ]},
      shadow: { enabled: true, x: 0, y: 22, blur: 44, spread: 0, color: '#7A244A', opacity: 28 }
    },
    'Ocean': {
      ...deepCopy(defaults),
      gradient: { type: 'linear', angle: 125, centerX: 50, centerY: 50, stops: [
        { color: '#00C6FF', opacity: 100, position: 0 }, { color: '#0072FF', opacity: 100, position: 100 }
      ]},
      shadow: { enabled: true, x: 0, y: 16, blur: 32, spread: 0, color: '#0068C9', opacity: 30 },
      radius: { linked: true, tl: 40, tr: 40, bl: 40, br: 40 }
    }
  };

  let state = deepCopy(defaults);
  let activeCode = 'css';

  const inputs = {
    width: $('widthInput'), height: $('heightInput'), transparentOutside: $('transparentOutsideInput'),
    gradientType: $('gradientTypeInput'), angle: $('angleInput'), centerX: $('centerXInput'), centerY: $('centerYInput'),
    shadowEnabled: $('shadowEnabledInput'), shadowX: $('shadowXInput'), shadowY: $('shadowYInput'), shadowBlur: $('shadowBlurInput'), shadowSpread: $('shadowSpreadInput'), shadowColor: $('shadowColorInput'), shadowOpacity: $('shadowOpacityInput'),
    linkRadius: $('linkRadiusInput'), radiusTL: $('radiusTLInput'), radiusTR: $('radiusTRInput'), radiusBL: $('radiusBLInput'), radiusBR: $('radiusBRInput'),
    borderWidth: $('borderWidthInput'), borderColor: $('borderColorInput'), borderOpacity: $('borderOpacityInput')
  };

  function gradientCss(s = state) {
    const stops = s.gradient.stops
      .slice().sort((a,b) => a.position - b.position)
      .map(stop => `${rgba(stop.color, stop.opacity)} ${clamp(stop.position,0,100)}%`).join(', ');
    if (s.gradient.type === 'radial') return `radial-gradient(circle at ${s.gradient.centerX}% ${s.gradient.centerY}%, ${stops})`;
    if (s.gradient.type === 'conic') return `conic-gradient(from ${s.gradient.angle}deg at ${s.gradient.centerX}% ${s.gradient.centerY}%, ${stops})`;
    return `linear-gradient(${s.gradient.angle}deg, ${stops})`;
  }

  function borderRadiusCss(s = state) {
    const r = s.radius;
    return `${r.tl}px ${r.tr}px ${r.br}px ${r.bl}px`;
  }

  function shadowCss(s = state) {
    if (!s.shadow.enabled) return 'none';
    const sh = s.shadow;
    return `${sh.x}px ${sh.y}px ${sh.blur}px ${sh.spread}px ${rgba(sh.color, sh.opacity)}`;
  }

  function updatePreview() {
    const box = $('previewBox');
    const maxW = Math.min(state.width, 900);
    const ratio = state.height / state.width;
    const displayW = Math.max(80, maxW);
    const displayH = Math.max(50, displayW * ratio);
    box.style.width = `${displayW}px`;
    box.style.height = `${displayH}px`;
    box.style.background = gradientCss();
    box.style.borderRadius = borderRadiusCss();
    box.style.boxShadow = shadowCss();
    box.style.border = `${state.border.width}px solid ${rgba(state.border.color, state.border.opacity)}`;
    $('sizeLabel').textContent = `${state.width} × ${state.height}`;
    updateCode();
  }

  function renderStops() {
    const list = $('stopsList');
    list.innerHTML = '';
    state.gradient.stops.forEach((stop, index) => {
      const row = document.createElement('div');
      row.className = 'stop-row';
      row.innerHTML = `
        <label><small>Color</small><input type="color" data-kind="color" data-index="${index}" value="${normalizeHex(stop.color)}"></label>
        <label><small>HEX</small><input type="text" data-kind="hex" data-index="${index}" maxlength="7" value="${normalizeHex(stop.color)}"></label>
        <label class="stop-opacity"><small>Alpha</small><input type="number" data-kind="opacity" data-index="${index}" min="0" max="100" value="${stop.opacity}"></label>
        <label><small>Pos %</small><input type="number" data-kind="position" data-index="${index}" min="0" max="100" value="${stop.position}"></label>
        <button class="remove-stop" data-index="${index}" title="Remove stop" ${state.gradient.stops.length <= 2 ? 'disabled' : ''}>×</button>`;
      list.appendChild(row);
    });

    list.querySelectorAll('input').forEach(input => input.addEventListener('input', (e) => {
      const i = Number(e.target.dataset.index);
      const kind = e.target.dataset.kind;
      if (kind === 'color' || kind === 'hex') {
        const value = normalizeHex(e.target.value, state.gradient.stops[i].color);
        if (kind === 'color' || /^#[0-9a-fA-F]{6}$/.test(e.target.value)) state.gradient.stops[i].color = value;
        if (kind === 'color') {
          const hexInput = list.querySelector(`input[data-kind="hex"][data-index="${i}"]`);
          if (hexInput) hexInput.value = value;
        }
      } else if (kind === 'opacity') state.gradient.stops[i].opacity = clamp(e.target.value, 0, 100);
      else if (kind === 'position') state.gradient.stops[i].position = clamp(e.target.value, 0, 100);
      updatePreview();
    }));

    list.querySelectorAll('.remove-stop').forEach(btn => btn.addEventListener('click', () => {
      if (state.gradient.stops.length <= 2) return;
      state.gradient.stops.splice(Number(btn.dataset.index), 1);
      renderStops(); updatePreview();
    }));
  }

  function syncInputsFromState() {
    inputs.width.value = state.width; inputs.height.value = state.height; inputs.transparentOutside.checked = state.transparentOutside;
    inputs.gradientType.value = state.gradient.type; inputs.angle.value = state.gradient.angle; inputs.centerX.value = state.gradient.centerX; inputs.centerY.value = state.gradient.centerY;
    inputs.shadowEnabled.checked = state.shadow.enabled; inputs.shadowX.value = state.shadow.x; inputs.shadowY.value = state.shadow.y; inputs.shadowBlur.value = state.shadow.blur; inputs.shadowSpread.value = state.shadow.spread; inputs.shadowColor.value = state.shadow.color; inputs.shadowOpacity.value = state.shadow.opacity;
    inputs.linkRadius.checked = state.radius.linked; inputs.radiusTL.value = state.radius.tl; inputs.radiusTR.value = state.radius.tr; inputs.radiusBL.value = state.radius.bl; inputs.radiusBR.value = state.radius.br;
    inputs.borderWidth.value = state.border.width; inputs.borderColor.value = state.border.color; inputs.borderOpacity.value = state.border.opacity;
    updateGradientFields(); renderStops(); updatePreview();
  }

  function updateGradientFields() {
    $('radialControls').classList.toggle('hidden', state.gradient.type === 'linear');
    $('angleField').classList.toggle('hidden', state.gradient.type === 'radial');
  }

  function bindInput(input, setter, event = 'input') {
    input.addEventListener(event, () => { setter(input); updatePreview(); });
  }

  bindInput(inputs.width, el => state.width = clamp(el.value,16,4096));
  bindInput(inputs.height, el => state.height = clamp(el.value,16,4096));
  bindInput(inputs.transparentOutside, el => state.transparentOutside = el.checked, 'change');
  bindInput(inputs.gradientType, el => { state.gradient.type = el.value; updateGradientFields(); }, 'change');
  bindInput(inputs.angle, el => state.gradient.angle = clamp(el.value,0,360));
  bindInput(inputs.centerX, el => state.gradient.centerX = clamp(el.value,0,100));
  bindInput(inputs.centerY, el => state.gradient.centerY = clamp(el.value,0,100));
  bindInput(inputs.shadowEnabled, el => state.shadow.enabled = el.checked, 'change');
  bindInput(inputs.shadowX, el => state.shadow.x = clamp(el.value,-200,200));
  bindInput(inputs.shadowY, el => state.shadow.y = clamp(el.value,-200,200));
  bindInput(inputs.shadowBlur, el => state.shadow.blur = clamp(el.value,0,300));
  bindInput(inputs.shadowSpread, el => state.shadow.spread = clamp(el.value,-100,200));
  bindInput(inputs.shadowColor, el => { if (/^#[0-9a-fA-F]{6}$/.test(el.value)) state.shadow.color = normalizeHex(el.value); });
  bindInput(inputs.shadowOpacity, el => state.shadow.opacity = clamp(el.value,0,100));
  bindInput(inputs.linkRadius, el => state.radius.linked = el.checked, 'change');

  ['TL','TR','BL','BR'].forEach(k => {
    bindInput(inputs[`radius${k}`], el => {
      const value = clamp(el.value,0,1000);
      const key = k.toLowerCase();
      state.radius[key] = value;
      if (state.radius.linked) {
        state.radius.tl = state.radius.tr = state.radius.bl = state.radius.br = value;
        ['TL','TR','BL','BR'].forEach(other => inputs[`radius${other}`].value = value);
      }
    });
  });
  bindInput(inputs.borderWidth, el => state.border.width = clamp(el.value,0,50));
  bindInput(inputs.borderColor, el => { if (/^#[0-9a-fA-F]{6}$/.test(el.value)) state.border.color = normalizeHex(el.value); });
  bindInput(inputs.borderOpacity, el => state.border.opacity = clamp(el.value,0,100));

  $('addStopBtn').addEventListener('click', () => {
    if (state.gradient.stops.length >= 8) return;
    const sorted = state.gradient.stops.slice().sort((a,b) => a.position - b.position);
    const a = sorted[sorted.length - 2], b = sorted[sorted.length - 1];
    state.gradient.stops.push({ color: b.color, opacity: b.opacity, position: Math.round((a.position + b.position)/2) });
    state.gradient.stops.sort((x,y) => x.position-y.position);
    renderStops(); updatePreview();
  });

  function cssCode() {
    return `.background-card {\n  width: ${state.width}px;\n  height: ${state.height}px;\n  background: ${gradientCss()};\n  border-radius: ${borderRadiusCss()};\n  box-shadow: ${shadowCss()};\n  border: ${state.border.width}px solid ${rgba(state.border.color, state.border.opacity)};\n}`;
  }

  function gradientPoints(angle) {
    const rad = (angle - 90) * Math.PI / 180;
    const x = Math.cos(rad), y = Math.sin(rad);
    return {
      sx: +(0.5 - x/2).toFixed(4), sy: +(0.5 - y/2).toFixed(4),
      ex: +(0.5 + x/2).toFixed(4), ey: +(0.5 + y/2).toFixed(4)
    };
  }

  function uikitCode() {
    const stops = state.gradient.stops.slice().sort((a,b)=>a.position-b.position);
    const colors = stops.map(s => `        ${uiColor(s.color,s.opacity)}.cgColor`).join(',\n');
    const locs = stops.map(s => (s.position/100).toFixed(2)).join(', ');
    const p = gradientPoints(state.gradient.angle);
    const gradientSetup = state.gradient.type === 'linear'
      ? `gradient.type = .axial\ngradient.startPoint = CGPoint(x: ${p.sx}, y: ${p.sy})\ngradient.endPoint = CGPoint(x: ${p.ex}, y: ${p.ey})`
      : state.gradient.type === 'radial'
      ? `gradient.type = .radial\ngradient.startPoint = CGPoint(x: ${(state.gradient.centerX/100).toFixed(2)}, y: ${(state.gradient.centerY/100).toFixed(2)})\ngradient.endPoint = CGPoint(x: 1.0, y: 1.0)`
      : `gradient.type = .conic\ngradient.startPoint = CGPoint(x: ${(state.gradient.centerX/100).toFixed(2)}, y: ${(state.gradient.centerY/100).toFixed(2)})\ngradient.endPoint = CGPoint(x: 0.5, y: 0.0)`;
    const sh = state.shadow;
    return `// Call after view.bounds has its final size.\nlet gradient = CAGradientLayer()\ngradient.frame = view.bounds\ngradient.colors = [\n${colors}\n]\ngradient.locations = [${locs}]\n${gradientSetup}\n\nlet radii = CornerRadii(topLeft: ${state.radius.tl}, topRight: ${state.radius.tr}, bottomLeft: ${state.radius.bl}, bottomRight: ${state.radius.br})\nlet path = UIBezierPath.roundedRect(view.bounds, radii: radii)\nlet mask = CAShapeLayer()\nmask.path = path.cgPath\ngradient.mask = mask\nview.layer.insertSublayer(gradient, at: 0)\n\nlet border = CAShapeLayer()\nborder.path = path.cgPath\nborder.fillColor = UIColor.clear.cgColor\nborder.strokeColor = ${uiColor(state.border.color,state.border.opacity)}.cgColor\nborder.lineWidth = ${state.border.width}\nview.layer.addSublayer(border)\n\nview.layer.shadowColor = ${uiColor(sh.color,100)}.cgColor\nview.layer.shadowOpacity = ${sh.enabled ? (sh.opacity/100).toFixed(3) : '0'}\nview.layer.shadowOffset = CGSize(width: ${sh.x}, height: ${sh.y})\nview.layer.shadowRadius = ${(sh.blur/2).toFixed(1)}\nview.layer.shadowPath = path.cgPath\n\nstruct CornerRadii {\n    let topLeft: CGFloat\n    let topRight: CGFloat\n    let bottomLeft: CGFloat\n    let bottomRight: CGFloat\n}\n\nextension UIBezierPath {\n    static func roundedRect(_ rect: CGRect, radii: CornerRadii) -> UIBezierPath {\n        let p = UIBezierPath()\n        p.move(to: CGPoint(x: rect.minX + radii.topLeft, y: rect.minY))\n        p.addLine(to: CGPoint(x: rect.maxX - radii.topRight, y: rect.minY))\n        p.addArc(withCenter: CGPoint(x: rect.maxX - radii.topRight, y: rect.minY + radii.topRight), radius: radii.topRight, startAngle: -.pi/2, endAngle: 0, clockwise: true)\n        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - radii.bottomRight))\n        p.addArc(withCenter: CGPoint(x: rect.maxX - radii.bottomRight, y: rect.maxY - radii.bottomRight), radius: radii.bottomRight, startAngle: 0, endAngle: .pi/2, clockwise: true)\n        p.addLine(to: CGPoint(x: rect.minX + radii.bottomLeft, y: rect.maxY))\n        p.addArc(withCenter: CGPoint(x: rect.minX + radii.bottomLeft, y: rect.maxY - radii.bottomLeft), radius: radii.bottomLeft, startAngle: .pi/2, endAngle: .pi, clockwise: true)\n        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY + radii.topLeft))\n        p.addArc(withCenter: CGPoint(x: rect.minX + radii.topLeft, y: rect.minY + radii.topLeft), radius: radii.topLeft, startAngle: .pi, endAngle: .pi * 1.5, clockwise: true)\n        p.close()\n        return p\n    }\n}`;
  }

  function swiftUIGradient() {
    const stops = state.gradient.stops.slice().sort((a,b)=>a.position-b.position);
    const swiftStops = stops.map(s => `.init(color: ${swiftColor(s.color,s.opacity)}, location: ${(s.position/100).toFixed(2)})`).join(',\n                ');
    const p = gradientPoints(state.gradient.angle);
    if (state.gradient.type === 'radial') return `RadialGradient(\n            stops: [\n                ${swiftStops}\n            ],\n            center: UnitPoint(x: ${(state.gradient.centerX/100).toFixed(2)}, y: ${(state.gradient.centerY/100).toFixed(2)}),\n            startRadius: 0,\n            endRadius: 420\n        )`;
    if (state.gradient.type === 'conic') return `AngularGradient(\n            stops: [\n                ${swiftStops}\n            ],\n            center: UnitPoint(x: ${(state.gradient.centerX/100).toFixed(2)}, y: ${(state.gradient.centerY/100).toFixed(2)}),\n            angle: .degrees(${state.gradient.angle})\n        )`;
    return `LinearGradient(\n            stops: [\n                ${swiftStops}\n            ],\n            startPoint: UnitPoint(x: ${p.sx}, y: ${p.sy}),\n            endPoint: UnitPoint(x: ${p.ex}, y: ${p.ey})\n        )`;
  }

  function swiftUICode() {
    const sh = state.shadow;
    return `// iOS 17+\nRectangle()\n    .fill(\n        ${swiftUIGradient()}\n    )\n    .frame(width: ${state.width}, height: ${state.height})\n    .clipShape(\n        UnevenRoundedRectangle(cornerRadii: .init(\n            topLeading: ${state.radius.tl},\n            bottomLeading: ${state.radius.bl},\n            bottomTrailing: ${state.radius.br},\n            topTrailing: ${state.radius.tr}\n        ))\n    )\n    .overlay {\n        UnevenRoundedRectangle(cornerRadii: .init(\n            topLeading: ${state.radius.tl}, bottomLeading: ${state.radius.bl},\n            bottomTrailing: ${state.radius.br}, topTrailing: ${state.radius.tr}\n        ))\n        .stroke(${swiftColor(state.border.color,state.border.opacity)}, lineWidth: ${state.border.width})\n    }\n    .shadow(\n        color: ${swiftColor(sh.color, sh.enabled ? sh.opacity : 0)},\n        radius: ${(sh.blur/2).toFixed(1)},\n        x: ${sh.x},\n        y: ${sh.y}\n    )`;
  }

  function updateCode() {
    const map = { css: cssCode, uikit: uikitCode, swiftui: swiftUICode };
    $('codeOutput').textContent = map[activeCode]();
    $('codeTitle').textContent = activeCode === 'css' ? 'CSS' : activeCode === 'uikit' ? 'UIKit / Swift' : 'SwiftUI';
  }

  document.querySelectorAll('.code-tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.code-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); activeCode = btn.dataset.code; updateCode();
  }));

  $('copyCodeBtn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('codeOutput').textContent);
      $('copyCodeBtn').textContent = 'Copied';
      setTimeout(() => $('copyCodeBtn').textContent = 'Copy code', 1000);
    } catch {
      $('exportStatus').textContent = 'Clipboard is unavailable. Select the code manually.';
    }
  });

  document.querySelectorAll('.preview-mode').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.preview-mode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $('previewStage').className = `preview-stage ${btn.dataset.bg}`;
  }));

  function renderPresets() {
    const list = $('presetList'); list.innerHTML = '';
    const custom = JSON.parse(localStorage.getItem('backgroundStudioPresets') || '{}');
    const all = { ...builtInPresets, ...custom };
    Object.keys(all).forEach(name => {
      const btn = document.createElement('button'); btn.className = 'preset-chip'; btn.textContent = name;
      btn.addEventListener('click', () => { state = deepCopy(all[name]); syncInputsFromState(); });
      list.appendChild(btn);
    });
  }

  $('savePresetBtn').addEventListener('click', () => {
    const name = prompt('Preset name');
    if (!name || !name.trim()) return;
    const custom = JSON.parse(localStorage.getItem('backgroundStudioPresets') || '{}');
    custom[name.trim()] = deepCopy(state);
    localStorage.setItem('backgroundStudioPresets', JSON.stringify(custom));
    renderPresets();
  });

  $('exportJsonBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'background-preset.json');
  });

  $('importJsonInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      validateImported(parsed);
      state = parsed; syncInputsFromState();
      $('exportStatus').textContent = 'Preset imported.';
    } catch (err) {
      $('exportStatus').textContent = `Invalid preset: ${err.message}`;
    }
    e.target.value = '';
  });

  function validateImported(v) {
    if (!v || typeof v !== 'object' || !v.gradient || !Array.isArray(v.gradient.stops) || v.gradient.stops.length < 2) throw new Error('missing gradient stops');
    if (!v.shadow || !v.radius || !v.border) throw new Error('missing required sections');
  }

  $('resetBtn').addEventListener('click', () => { state = deepCopy(defaults); syncInputsFromState(); });
  $('randomBtn').addEventListener('click', () => {
    const color = () => '#' + Array.from({length:6}, () => '0123456789ABCDEF'[Math.floor(Math.random()*16)]).join('');
    state.gradient.type = ['linear','radial','conic'][Math.floor(Math.random()*3)];
    state.gradient.angle = Math.floor(Math.random()*361);
    state.gradient.centerX = 25 + Math.floor(Math.random()*51);
    state.gradient.centerY = 25 + Math.floor(Math.random()*51);
    state.gradient.stops = [
      { color: color(), opacity: 100, position: 0 },
      { color: color(), opacity: 100, position: 50 },
      { color: color(), opacity: 100, position: 100 }
    ];
    const r = 12 + Math.floor(Math.random()*55);
    state.radius = { linked: true, tl:r,tr:r,bl:r,br:r };
    syncInputsFromState();
  });

  function pathRoundedRect(ctx, x, y, w, h, r) {
    const maxR = Math.min(w, h) / 2;
    const tl = Math.min(r.tl, maxR), tr = Math.min(r.tr, maxR), bl = Math.min(r.bl, maxR), br = Math.min(r.br, maxR);
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br); ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl); ctx.quadraticCurveTo(x, y, x + tl, y); ctx.closePath();
  }

  function canvasGradient(ctx, x, y, w, h) {
    let g;
    if (state.gradient.type === 'linear') {
      const rad = (state.gradient.angle - 90) * Math.PI / 180;
      const cx = x + w/2, cy = y + h/2;
      const len = Math.abs(w*Math.cos(rad)) + Math.abs(h*Math.sin(rad));
      const dx = Math.cos(rad)*len/2, dy = Math.sin(rad)*len/2;
      g = ctx.createLinearGradient(cx-dx, cy-dy, cx+dx, cy+dy);
    } else if (state.gradient.type === 'radial') {
      const cx = x + w*state.gradient.centerX/100, cy = y + h*state.gradient.centerY/100;
      const radius = Math.hypot(Math.max(cx-x, x+w-cx), Math.max(cy-y, y+h-cy));
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    } else if (typeof ctx.createConicGradient === 'function') {
      g = ctx.createConicGradient((state.gradient.angle-90)*Math.PI/180, x+w*state.gradient.centerX/100, y+h*state.gradient.centerY/100);
    } else {
      g = ctx.createLinearGradient(x, y, x+w, y+h);
    }
    state.gradient.stops.slice().sort((a,b)=>a.position-b.position).forEach(s => g.addColorStop(clamp(s.position,0,100)/100, rgba(s.color,s.opacity)));
    return g;
  }

  function renderCanvas(scale = 1, forceOpaque = false) {
    const sh = state.shadow;
    const shadowExtent = sh.enabled ? Math.ceil(Math.max(0, sh.blur * 1.6 + Math.abs(sh.spread) + Math.max(Math.abs(sh.x), Math.abs(sh.y)))) : 0;
    const pad = Math.max(8, shadowExtent);
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((state.width + pad*2)*scale); canvas.height = Math.ceil((state.height + pad*2)*scale);
    const ctx = canvas.getContext('2d'); ctx.scale(scale, scale);
    if (forceOpaque || !state.transparentOutside) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,canvas.width/scale,canvas.height/scale); }
    const x = pad, y = pad;

    if (sh.enabled) {
      ctx.save();
      ctx.shadowColor = rgba(sh.color, sh.opacity); ctx.shadowBlur = sh.blur; ctx.shadowOffsetX = sh.x; ctx.shadowOffsetY = sh.y;
      pathRoundedRect(ctx, x - sh.spread, y - sh.spread, state.width + sh.spread*2, state.height + sh.spread*2, {
        tl: state.radius.tl + sh.spread, tr: state.radius.tr + sh.spread, bl: state.radius.bl + sh.spread, br: state.radius.br + sh.spread
      });
      ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill(); ctx.restore();
    }

    pathRoundedRect(ctx, x, y, state.width, state.height, state.radius);
    ctx.fillStyle = canvasGradient(ctx, x, y, state.width, state.height); ctx.fill();
    if (state.border.width > 0) {
      ctx.save(); pathRoundedRect(ctx, x, y, state.width, state.height, state.radius);
      ctx.strokeStyle = rgba(state.border.color,state.border.opacity); ctx.lineWidth = state.border.width; ctx.stroke(); ctx.restore();
    }
    return canvas;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error(`${type} export is not supported by this browser.`)), type, quality));
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function svgRoundedPath(x,y,w,h,r) {
    const m = Math.min(w,h)/2, tl=Math.min(r.tl,m),tr=Math.min(r.tr,m),bl=Math.min(r.bl,m),br=Math.min(r.br,m);
    return `M ${x+tl} ${y} H ${x+w-tr} Q ${x+w} ${y} ${x+w} ${y+tr} V ${y+h-br} Q ${x+w} ${y+h} ${x+w-br} ${y+h} H ${x+bl} Q ${x} ${y+h} ${x} ${y+h-bl} V ${y+tl} Q ${x} ${y} ${x+tl} ${y} Z`;
  }

  function svgString() {
    if (state.gradient.type === 'conic') return null;
    const sh = state.shadow;
    const pad = sh.enabled ? Math.ceil(Math.max(12, sh.blur*1.7 + Math.abs(sh.spread) + Math.max(Math.abs(sh.x),Math.abs(sh.y)))) : 8;
    const totalW = state.width+pad*2, totalH=state.height+pad*2;
    const stops = state.gradient.stops.slice().sort((a,b)=>a.position-b.position).map(s => `<stop offset="${s.position}%" stop-color="${normalizeHex(s.color)}" stop-opacity="${(s.opacity/100).toFixed(3)}"/>`).join('');
    let grad;
    if (state.gradient.type === 'linear') {
      const p=gradientPoints(state.gradient.angle);
      grad=`<linearGradient id="g" x1="${p.sx}" y1="${p.sy}" x2="${p.ex}" y2="${p.ey}">${stops}</linearGradient>`;
    } else {
      grad=`<radialGradient id="g" cx="${state.gradient.centerX}%" cy="${state.gradient.centerY}%" r="75%">${stops}</radialGradient>`;
    }
    const path=svgRoundedPath(pad,pad,state.width,state.height,state.radius);
    const shadowFilter=sh.enabled ? `<filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${sh.x}" dy="${sh.y}" stdDeviation="${sh.blur/2}" flood-color="${normalizeHex(sh.color)}" flood-opacity="${sh.opacity/100}"/></filter>` : '';
    const bg = state.transparentOutside ? '' : `<rect width="100%" height="100%" fill="#FFFFFF"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}"><defs>${grad}${shadowFilter}</defs>${bg}<path d="${path}" fill="url(#g)" ${sh.enabled?'filter="url(#shadow)"':''} stroke="${normalizeHex(state.border.color)}" stroke-opacity="${state.border.opacity/100}" stroke-width="${state.border.width}"/></svg>`;
  }

  $('downloadImageBtn').addEventListener('click', async () => {
    const format = $('exportFormatInput').value;
    const scale = Number($('exportScaleInput').value);
    const quality = clamp($('jpegQualityInput').value,10,100)/100;
    const status = $('exportStatus'); status.textContent = 'Preparing export…';
    try {
      if (format === 'svg') {
        const svg = svgString();
        if (!svg) throw new Error('SVG export for conic gradients is not supported. Choose PNG/WebP/PDF or switch gradient type.');
        downloadBlob(new Blob([svg], {type:'image/svg+xml'}), 'background.svg');
      } else if (format === 'pdf') {
        if (!window.jspdf?.jsPDF) throw new Error('PDF library could not load. Check your internet connection or use PNG.');
        const canvas = renderCanvas(scale, true);
        const png = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait';
        const pdf = new jsPDF({ orientation, unit:'px', format:[canvas.width,canvas.height], hotfixes:['px_scaling'] });
        pdf.addImage(png,'PNG',0,0,canvas.width,canvas.height); pdf.save('background.pdf');
      } else {
        const canvas = renderCanvas(scale, format === 'jpeg');
        const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        const blob = await canvasToBlob(canvas,mime,format==='jpeg'||format==='webp'?quality:undefined);
        if (format === 'webp' && blob.type !== 'image/webp') throw new Error('WebP export is not supported by this browser.');
        downloadBlob(blob,`background.${format === 'jpeg' ? 'jpg' : format}`);
      }
      status.textContent = `Exported ${format.toUpperCase()} successfully.`;
    } catch (err) { status.textContent = err.message; }
  });

  $('exportFormatInput').addEventListener('change', () => {
    const f=$('exportFormatInput').value;
    $('jpegQualityInput').disabled = !['jpeg','webp'].includes(f);
    $('exportScaleInput').disabled = f==='svg';
  });

  renderPresets(); syncInputsFromState(); $('exportFormatInput').dispatchEvent(new Event('change'));
})();
