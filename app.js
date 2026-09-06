(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, Number.isFinite(+v) ? +v : min));
  const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const fmt = (v, digits = 2) => Number(v).toFixed(digits).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  const deepCopy = (v) => JSON.parse(JSON.stringify(v));
  const escapeXml = (s) => String(s).replace(/[<>&"']/g, ch => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[ch]));

  function normalizeHex(hex, fallback = '#000000') {
    const raw = String(hex || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(raw)) return ('#' + raw.slice(1).split('').map(c => c + c).join('')).toUpperCase();
    return fallback;
  }

  function hexToRgb(hex) {
    const h = normalizeHex(hex).slice(1);
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r,g,b].map(v => clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('').toUpperCase();
  }

  function rgba(hex, opacity) {
    const {r,g,b} = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${clamp(opacity,0,100)/100})`;
  }

  function parseCssColor(raw) {
    const value = String(raw || '').trim();
    let m;
    if ((m = value.match(/^#([0-9a-f]{8})$/i))) {
      const h = m[1];
      return { color: '#' + h.slice(0,6).toUpperCase(), opacity: +(parseInt(h.slice(6,8),16)/255*100).toFixed(2) };
    }
    if (/^#[0-9a-f]{6}$/i.test(value) || /^#[0-9a-f]{3}$/i.test(value)) return { color: normalizeHex(value), opacity: 100 };
    if ((m = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+%?))?\s*\)$/i))) {
      const aRaw = m[4];
      const alpha = aRaw == null ? 100 : aRaw.endsWith('%') ? clamp(parseFloat(aRaw),0,100) : clamp(parseFloat(aRaw)*100,0,100);
      return { color: rgbToHex(+m[1],+m[2],+m[3]), opacity: +alpha.toFixed(2) };
    }
    return null;
  }

  function splitTopLevel(text, delimiter = ',') {
    const out = []; let depth = 0; let start = 0;
    for (let i=0;i<text.length;i++) {
      const ch = text[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth-1);
      else if (ch === delimiter && depth === 0) { out.push(text.slice(start,i).trim()); start = i+1; }
    }
    out.push(text.slice(start).trim());
    return out.filter(Boolean);
  }

  function extractFunction(text, name) {
    const idx = text.toLowerCase().indexOf(name.toLowerCase() + '(');
    if (idx < 0) return null;
    const start = idx + name.length + 1; let depth = 1;
    for (let i=start;i<text.length;i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')') { depth--; if (depth === 0) return text.slice(start,i); }
    }
    return null;
  }

  function parsePxValues(raw) {
    const values = [];
    const text = String(raw || '');
    const re = /(-?(?:\d+\.?\d*|\.\d+))\s*(px)?\b/gi;
    let m;
    while ((m = re.exec(text))) {
      const value = Number(m[1]);
      // CSS permits unitless zero; non-zero lengths must be px for this tool.
      if (m[2] || value === 0) values.push(value);
    }
    return values;
  }

  function parseLengthPx(raw) {
    const values = parsePxValues(raw);
    return values.length ? values[0] : null;
  }

  function parseRadiusValue(raw) {
    let text = String(raw || '').trim();
    const variable = text.match(/var\([^,]+,\s*([^)]+)\)/i);
    if (variable) text = variable[1].trim();
    const beforeSlash = text.split('/')[0].trim();
    const values = parsePxValues(beforeSlash);
    if (!values.length) return null;
    const [a,b=a,c=a,d=b] = values;
    if (values.length === 1) return {tl:a,tr:a,br:a,bl:a};
    if (values.length === 2) return {tl:a,tr:b,br:a,bl:b};
    if (values.length === 3) return {tl:a,tr:b,br:c,bl:b};
    return {tl:a,tr:b,br:c,bl:d};
  }

  function parseColorStop(part, fallbackPosition) {
    const m = String(part).trim().match(/^(#[0-9a-f]{3,8}|rgba?\([^)]*\))\s*(.*)$/i);
    if (!m) return null;
    const parsedColor = parseCssColor(m[1]);
    if (!parsedColor) return null;
    const posMatch = m[2].match(/(-?\d*\.?\d+)\s*%/);
    return { color: parsedColor.color, opacity: parsedColor.opacity, position: posMatch ? +posMatch[1] : fallbackPosition };
  }

  const defaults = {
    width: 640, height: 400, transparentOutside: true,
    gradient: {
      type: 'linear', angle: 135, centerX: 50, centerY: 50, sizeX: 100, sizeY: 100,
      stops: [
        {color:'#665BFF',opacity:100,position:0},
        {color:'#B86BFF',opacity:100,position:48},
        {color:'#FF6FAE',opacity:100,position:100}
      ]
    },
    shadow: {enabled:true,x:0,y:18,blur:36,spread:0,color:'#000000',opacity:22},
    radius: {linked:true,tl:32,tr:32,br:32,bl:32},
    border: {width:0,color:'#FFFFFF',opacity:100},
    tag: {enabled:false,text:'Hot',fontSize:14,fontWeight:600,hPadding:8,vPadding:4,tipWidth:6,minHeight:24,bgColor:'#F04438',textColor:'#FFFFFF'}
  };

  const exampleCss = `border-radius: var(--radius-20x, 20px);\nbackground: radial-gradient(147.02% 142.82% at 33.82% 122.46%, #DBEAFF 52.4%, #FFF2D7 86.74%, #F78353 100%);\nbox-shadow: 0 4px 32px 0 rgba(10, 13, 18, 0.08);`;

  const builtInPresets = {
    'Design example': (() => { const s=deepCopy(defaults); s.gradient={type:'radial',angle:0,centerX:33.82,centerY:122.46,sizeX:147.02,sizeY:142.82,stops:[{color:'#DBEAFF',opacity:100,position:52.4},{color:'#FFF2D7',opacity:100,position:86.74},{color:'#F78353',opacity:100,position:100}]}; s.shadow={enabled:true,x:0,y:4,blur:32,spread:0,color:'#0A0D12',opacity:8}; s.radius={linked:true,tl:20,tr:20,br:20,bl:20}; return s; })(),
    'Aurora': defaults,
    'iOS Card': (() => { const s=deepCopy(defaults); s.gradient={type:'linear',angle:150,centerX:50,centerY:50,sizeX:100,sizeY:100,stops:[{color:'#FFFFFF',opacity:100,position:0},{color:'#E9EEFF',opacity:100,position:100}]}; s.shadow={enabled:true,x:0,y:10,blur:28,spread:0,color:'#0B1020',opacity:14}; s.radius={linked:true,tl:24,tr:24,br:24,bl:24}; s.border={width:1,color:'#FFFFFF',opacity:60}; return s; })()
  };

  let state = deepCopy(defaults);
  let activeCode = 'css';

  const inputs = {
    width:$('widthInput'), height:$('heightInput'), transparentOutside:$('transparentOutsideInput'),
    gradientType:$('gradientTypeInput'), angle:$('angleInput'), centerX:$('centerXInput'), centerY:$('centerYInput'), sizeX:$('radialSizeXInput'), sizeY:$('radialSizeYInput'),
    shadowEnabled:$('shadowEnabledInput'), shadowX:$('shadowXInput'), shadowY:$('shadowYInput'), shadowBlur:$('shadowBlurInput'), shadowSpread:$('shadowSpreadInput'), shadowColor:$('shadowColorInput'), shadowOpacity:$('shadowOpacityInput'),
    linkRadius:$('linkRadiusInput'), radiusTL:$('radiusTLInput'), radiusTR:$('radiusTRInput'), radiusBR:$('radiusBRInput'), radiusBL:$('radiusBLInput'),
    borderWidth:$('borderWidthInput'), borderColor:$('borderColorInput'), borderOpacity:$('borderOpacityInput'),
    tagEnabled:$('tagEnabledInput'), tagText:$('tagTextInput'), tagFontSize:$('tagFontSizeInput'), tagFontWeight:$('tagFontWeightInput'),
    tagHPadding:$('tagHPaddingInput'), tagVPadding:$('tagVPaddingInput'), tagTipWidth:$('tagTipWidthInput'), tagMinHeight:$('tagMinHeightInput'),
    tagBgColor:$('tagBgColorInput'), tagTextColor:$('tagTextColorInput')
  };

  function gradientCss(s=state) {
    const stops = s.gradient.stops.slice().sort((a,b)=>a.position-b.position)
      .map(v => `${rgba(v.color,v.opacity)} ${fmt(v.position)}%`).join(', ');
    if (s.gradient.type === 'radial') return `radial-gradient(${fmt(s.gradient.sizeX)}% ${fmt(s.gradient.sizeY)}% at ${fmt(s.gradient.centerX)}% ${fmt(s.gradient.centerY)}%, ${stops})`;
    if (s.gradient.type === 'conic') return `conic-gradient(from ${fmt(s.gradient.angle)}deg at ${fmt(s.gradient.centerX)}% ${fmt(s.gradient.centerY)}%, ${stops})`;
    return `linear-gradient(${fmt(s.gradient.angle)}deg, ${stops})`;
  }

  function borderRadiusCss(s=state) {
    const r=s.radius;
    return `${fmt(r.tl)}px ${fmt(r.tr)}px ${fmt(r.br)}px ${fmt(r.bl)}px`;
  }
  function shadowCss(s=state) { const sh=s.shadow; return !sh.enabled ? 'none' : `${fmt(sh.x)}px ${fmt(sh.y)}px ${fmt(sh.blur)}px ${fmt(sh.spread)}px ${rgba(sh.color,sh.opacity)}`; }

  function updateGradientFields() {
    $('radialControls').classList.toggle('hidden', state.gradient.type === 'linear');
    $('angleField').classList.toggle('hidden', state.gradient.type === 'radial');
    $('radialSizeXField').classList.toggle('hidden', state.gradient.type !== 'radial');
    $('radialSizeYField').classList.toggle('hidden', state.gradient.type !== 'radial');
  }

  function updateTagFields() {
    $('tagControls')?.classList.toggle('hidden', !state.tag?.enabled);
  }

  function measureTagSize() {
    const t=state.tag;
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    ctx.font=`${t.fontWeight} ${t.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const textWidth=Math.ceil(ctx.measureText(t.text || '').width);
    const textHeight=Math.ceil(t.fontSize*1.2);
    return {
      width: Math.max(1,textWidth + t.hPadding*2 + t.tipWidth),
      height: Math.max(t.minHeight,textHeight + t.vPadding*2),
      textWidth,
      textHeight
    };
  }

  function tagShadowFilterCss() {
    const sh=state.shadow;
    if(!sh.enabled)return 'none';
    return `drop-shadow(${fmt(sh.x)}px ${fmt(sh.y)}px ${fmt(sh.blur/2)}px ${rgba(sh.color,sh.opacity)})`;
  }

  function updatePreview() {
    const box=$('previewBox');
    const stage=$('previewStage');
    updateTagFields();
    if(state.tag?.enabled){
      const t=state.tag, size=measureTagSize();
      box.classList.add('tag-preview');
      box.textContent=t.text;
      box.style.width='max-content'; box.style.height='auto'; box.style.minHeight=`${t.minHeight}px`;
      box.style.padding=`${t.vPadding}px ${t.hPadding+t.tipWidth}px ${t.vPadding}px ${t.hPadding}px`;
      box.style.fontSize=`${t.fontSize}px`; box.style.fontWeight=String(t.fontWeight); box.style.color=t.textColor;
      box.style.background=t.bgColor; box.style.border='0'; box.style.borderRadius='0'; box.style.boxShadow='none'; box.style.filter=tagShadowFilterCss();
      box.style.clipPath=`polygon(0 0, calc(100% - ${t.tipWidth}px) 0, 100% 50%, calc(100% - ${t.tipWidth}px) 100%, 0 100%)`;
      stage.style.setProperty('--preview-ratio', String(size.height/size.width));
      $('sizeLabel').textContent=`auto ${size.width} × ${size.height}`;
    } else {
      box.classList.remove('tag-preview');
      box.textContent=''; box.style.display=''; box.style.padding=''; box.style.minHeight=''; box.style.fontSize=''; box.style.fontWeight=''; box.style.color=''; box.style.filter=''; box.style.clipPath=''; box.style.whiteSpace='';
      const maxW=Math.min(state.width, 900);
      const ratio=state.height/state.width;
      const displayW=Math.max(80,maxW);
      const displayH=Math.max(50,displayW*ratio);
      box.style.width=`${displayW}px`; box.style.height=`${displayH}px`;
      box.style.background=gradientCss(); box.style.borderRadius=borderRadiusCss(); box.style.boxShadow=shadowCss();
      box.style.border=`${state.border.width}px solid ${rgba(state.border.color,state.border.opacity)}`;
      stage.style.setProperty('--preview-ratio', String(ratio));
      $('sizeLabel').textContent=`${state.width} × ${state.height}`;
    }
    updateCode();
  }

  function renderStops() {
    const list=$('stopsList'); list.innerHTML='';
    state.gradient.stops.forEach((stop,index)=>{
      const row=document.createElement('div'); row.className='stop-row';
      row.innerHTML=`<label><small>Color</small><input type="color" data-kind="color" data-index="${index}" value="${normalizeHex(stop.color)}"></label>
      <label><small>HEX</small><input type="text" data-kind="hex" data-index="${index}" maxlength="9" value="${normalizeHex(stop.color)}"></label>
      <label class="stop-opacity"><small>Alpha</small><input type="number" data-kind="opacity" data-index="${index}" min="0" max="100" step="0.01" value="${fmt(stop.opacity)}"></label>
      <label><small>Pos %</small><input type="number" data-kind="position" data-index="${index}" min="-500" max="500" step="0.01" value="${fmt(stop.position)}"></label>
      <button class="remove-stop" data-index="${index}" title="Remove stop" ${state.gradient.stops.length<=2?'disabled':''}>×</button>`;
      list.appendChild(row);
    });
    list.querySelectorAll('input').forEach(el=>el.addEventListener('input',e=>{
      const i=+e.target.dataset.index, kind=e.target.dataset.kind;
      if (kind==='color') { state.gradient.stops[i].color=normalizeHex(e.target.value); const h=list.querySelector(`input[data-kind="hex"][data-index="${i}"]`); if(h)h.value=state.gradient.stops[i].color; }
      else if (kind==='hex' && /^#[0-9a-f]{3,6}$/i.test(e.target.value)) state.gradient.stops[i].color=normalizeHex(e.target.value,state.gradient.stops[i].color);
      else if (kind==='opacity') state.gradient.stops[i].opacity=clamp(e.target.value,0,100);
      else if (kind==='position') state.gradient.stops[i].position=clamp(e.target.value,-500,500);
      updatePreview();
    }));
    list.querySelectorAll('.remove-stop').forEach(btn=>btn.addEventListener('click',()=>{ if(state.gradient.stops.length<=2)return; state.gradient.stops.splice(+btn.dataset.index,1); renderStops(); updatePreview(); }));
  }

  function syncInputsFromState() {
    state.gradient.sizeX = num(state.gradient.sizeX,100); state.gradient.sizeY = num(state.gradient.sizeY,100);
    Object.assign(inputs.width,{value:state.width}); Object.assign(inputs.height,{value:state.height}); inputs.transparentOutside.checked=state.transparentOutside;
    inputs.gradientType.value=state.gradient.type; inputs.angle.value=state.gradient.angle; inputs.centerX.value=state.gradient.centerX; inputs.centerY.value=state.gradient.centerY; inputs.sizeX.value=state.gradient.sizeX; inputs.sizeY.value=state.gradient.sizeY;
    inputs.shadowEnabled.checked=state.shadow.enabled; inputs.shadowX.value=state.shadow.x; inputs.shadowY.value=state.shadow.y; inputs.shadowBlur.value=state.shadow.blur; inputs.shadowSpread.value=state.shadow.spread; inputs.shadowColor.value=state.shadow.color; inputs.shadowOpacity.value=state.shadow.opacity;
    inputs.linkRadius.checked=state.radius.linked; inputs.radiusTL.value=state.radius.tl; inputs.radiusTR.value=state.radius.tr; inputs.radiusBR.value=state.radius.br; inputs.radiusBL.value=state.radius.bl;
    inputs.borderWidth.value=state.border.width; inputs.borderColor.value=state.border.color; inputs.borderOpacity.value=state.border.opacity;
    state.tag={...deepCopy(defaults.tag),...(state.tag||{})};
    inputs.tagEnabled.checked=state.tag.enabled; inputs.tagText.value=state.tag.text; inputs.tagFontSize.value=state.tag.fontSize; inputs.tagFontWeight.value=state.tag.fontWeight;
    inputs.tagHPadding.value=state.tag.hPadding; inputs.tagVPadding.value=state.tag.vPadding; inputs.tagTipWidth.value=state.tag.tipWidth; inputs.tagMinHeight.value=state.tag.minHeight;
    inputs.tagBgColor.value=state.tag.bgColor; inputs.tagTextColor.value=state.tag.textColor;
    updateGradientFields(); updateTagFields(); renderStops(); updatePreview();
  }

  function bindInput(el,setter,event='input') { el?.addEventListener(event,()=>{ setter(el); updatePreview(); }); }
  bindInput(inputs.width,el=>state.width=clamp(el.value,16,4096)); bindInput(inputs.height,el=>state.height=clamp(el.value,16,4096)); bindInput(inputs.transparentOutside,el=>state.transparentOutside=el.checked,'change');
  bindInput(inputs.gradientType,el=>{state.gradient.type=el.value;updateGradientFields();},'change'); bindInput(inputs.angle,el=>state.gradient.angle=clamp(el.value,0,360));
  bindInput(inputs.centerX,el=>state.gradient.centerX=clamp(el.value,-500,500)); bindInput(inputs.centerY,el=>state.gradient.centerY=clamp(el.value,-500,500)); bindInput(inputs.sizeX,el=>state.gradient.sizeX=clamp(el.value,.01,1000)); bindInput(inputs.sizeY,el=>state.gradient.sizeY=clamp(el.value,.01,1000));
  bindInput(inputs.shadowEnabled,el=>state.shadow.enabled=el.checked,'change'); bindInput(inputs.shadowX,el=>state.shadow.x=clamp(el.value,-500,500)); bindInput(inputs.shadowY,el=>state.shadow.y=clamp(el.value,-500,500)); bindInput(inputs.shadowBlur,el=>state.shadow.blur=clamp(el.value,0,500)); bindInput(inputs.shadowSpread,el=>state.shadow.spread=clamp(el.value,-500,500)); bindInput(inputs.shadowColor,el=>{if(/^#[0-9a-f]{3,6}$/i.test(el.value))state.shadow.color=normalizeHex(el.value);}); bindInput(inputs.shadowOpacity,el=>state.shadow.opacity=clamp(el.value,0,100));
  bindInput(inputs.linkRadius,el=>state.radius.linked=el.checked,'change');
  ['TL','TR','BR','BL'].forEach(k=>bindInput(inputs[`radius${k}`],el=>{ const value=clamp(el.value,0,2000); const key=k.toLowerCase(); state.radius[key]=value; if(state.radius.linked){state.radius.tl=state.radius.tr=state.radius.br=state.radius.bl=value; ['TL','TR','BR','BL'].forEach(x=>inputs[`radius${x}`].value=value);} }));
  bindInput(inputs.borderWidth,el=>state.border.width=clamp(el.value,0,100)); bindInput(inputs.borderColor,el=>{if(/^#[0-9a-f]{3,6}$/i.test(el.value))state.border.color=normalizeHex(el.value);}); bindInput(inputs.borderOpacity,el=>state.border.opacity=clamp(el.value,0,100));
  bindInput(inputs.tagEnabled,el=>{state.tag.enabled=el.checked;updateTagFields();},'change');
  bindInput(inputs.tagText,el=>state.tag.text=el.value); bindInput(inputs.tagFontSize,el=>state.tag.fontSize=clamp(el.value,8,80)); bindInput(inputs.tagFontWeight,el=>state.tag.fontWeight=clamp(el.value,100,900));
  bindInput(inputs.tagHPadding,el=>state.tag.hPadding=clamp(el.value,0,100)); bindInput(inputs.tagVPadding,el=>state.tag.vPadding=clamp(el.value,0,100)); bindInput(inputs.tagTipWidth,el=>state.tag.tipWidth=clamp(el.value,0,100)); bindInput(inputs.tagMinHeight,el=>state.tag.minHeight=clamp(el.value,0,200));
  bindInput(inputs.tagBgColor,el=>{if(/^#[0-9a-f]{3,6}$/i.test(el.value))state.tag.bgColor=normalizeHex(el.value);}); bindInput(inputs.tagTextColor,el=>{if(/^#[0-9a-f]{3,6}$/i.test(el.value))state.tag.textColor=normalizeHex(el.value);});

  $('addStopBtn')?.addEventListener('click',()=>{ if(state.gradient.stops.length>=12)return; const sorted=state.gradient.stops.slice().sort((a,b)=>a.position-b.position); const a=sorted[sorted.length-2],b=sorted[sorted.length-1]; state.gradient.stops.push({color:b.color,opacity:b.opacity,position:+(((a.position+b.position)/2).toFixed(2))}); state.gradient.stops.sort((a,b)=>a.position-b.position); renderStops(); updatePreview(); });

  function parseGradient(background, next) {
    const lower=background.toLowerCase(); let body;
    if ((body=extractFunction(background,'radial-gradient')) != null) {
      const parts=splitTopLevel(body); if(parts.length<2)return false;
      let header=parts[0], stopStart=1;
      const firstLooksColor=/^(#|rgb)/i.test(header.trim());
      if(firstLooksColor){ header=''; stopStart=0; }
      const sizeAt = header.match(/(?:ellipse\s+|circle\s+)?(-?\d*\.?\d+)%\s+(-?\d*\.?\d+)%\s+at\s+(-?\d*\.?\d+)%\s+(-?\d*\.?\d+)%/i);
      const atOnly = header.match(/at\s+(-?\d*\.?\d+)%\s+(-?\d*\.?\d+)%/i);
      next.gradient.type='radial';
      if(sizeAt){ next.gradient.sizeX=+sizeAt[1]; next.gradient.sizeY=+sizeAt[2]; next.gradient.centerX=+sizeAt[3]; next.gradient.centerY=+sizeAt[4]; }
      else { next.gradient.sizeX=100; next.gradient.sizeY=100; if(atOnly){next.gradient.centerX=+atOnly[1];next.gradient.centerY=+atOnly[2];} }
      const stopParts=parts.slice(stopStart); const parsed=stopParts.map((p,i)=>parseColorStop(p, stopParts.length===1?0:i/(stopParts.length-1)*100)).filter(Boolean);
      if(parsed.length>=2){ let last=0; parsed.forEach((s,i)=>{ if(!Number.isFinite(s.position))s.position=i/(parsed.length-1)*100; last=s.position; }); next.gradient.stops=parsed; }
      return true;
    }
    if ((body=extractFunction(background,'linear-gradient')) != null) {
      const parts=splitTopLevel(body); if(parts.length<2)return false; let stopStart=0; const angle=parts[0].match(/(-?\d*\.?\d+)deg/i); if(angle){next.gradient.angle=+angle[1];stopStart=1;} next.gradient.type='linear'; const stopParts=parts.slice(stopStart); const parsed=stopParts.map((p,i)=>parseColorStop(p,i/(Math.max(1,stopParts.length-1))*100)).filter(Boolean); if(parsed.length>=2)next.gradient.stops=parsed; return true;
    }
    if ((body=extractFunction(background,'conic-gradient')) != null) {
      const parts=splitTopLevel(body); if(parts.length<2)return false; let stopStart=0; const head=parts[0]; const h=head.match(/from\s+(-?\d*\.?\d+)deg(?:\s+at\s+(-?\d*\.?\d+)%\s+(-?\d*\.?\d+)%)?/i); if(h){next.gradient.angle=+h[1]; if(h[2])next.gradient.centerX=+h[2]; if(h[3])next.gradient.centerY=+h[3]; stopStart=1;} next.gradient.type='conic'; const stopParts=parts.slice(stopStart); const parsed=stopParts.map((p,i)=>parseColorStop(p,i/(Math.max(1,stopParts.length-1))*100)).filter(Boolean); if(parsed.length>=2)next.gradient.stops=parsed; return true;
    }
    return false;
  }

  function parseBoxShadow(raw, next) {
    const value=String(raw||'').trim(); if(!value||value==='none'){next.shadow.enabled=false;return true;}
    const first=splitTopLevel(value)[0]; if(/\binset\b/i.test(first))return false;
    const colorMatch=first.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i); const parsedColor=colorMatch?parseCssColor(colorMatch[1]):{color:'#000000',opacity:100};
    const lengths=parsePxValues(colorMatch?first.replace(colorMatch[1],''):first); if(lengths.length<2)return false;
    next.shadow={enabled:true,x:lengths[0],y:lengths[1],blur:lengths[2]||0,spread:lengths[3]||0,color:parsedColor?.color||'#000000',opacity:parsedColor?.opacity??100}; return true;
  }

  function parseCssStyle(cssText) {
    const cleaned=String(cssText||'').replace(/\/\*[\s\S]*?\*\//g,' '); const next=deepCopy(state); const changed=[];
    const declarations=cleaned.split(';').map(v=>v.trim()).filter(Boolean);
    const map={}; declarations.forEach(d=>{const i=d.indexOf(':'); if(i>0)map[d.slice(0,i).trim().toLowerCase()]=d.slice(i+1).trim();});
    if(map.width){const v=parseLengthPx(map.width);if(v!=null){next.width=clamp(v,16,4096);changed.push('width');}}
    if(map.height){const v=parseLengthPx(map.height);if(v!=null){next.height=clamp(v,16,4096);changed.push('height');}}
    if(map.background && parseGradient(map.background,next))changed.push('gradient');
    else if(map['background-image'] && parseGradient(map['background-image'],next))changed.push('gradient');
    if(map['box-shadow'] && parseBoxShadow(map['box-shadow'],next))changed.push('shadow');
    let r=parseRadiusValue(map['border-radius']);
    if(r){next.radius={linked:r.tl===r.tr&&r.tr===r.br&&r.br===r.bl,...r};changed.push('radius');}
    const cornerProps={tl:'border-top-left-radius',tr:'border-top-right-radius',br:'border-bottom-right-radius',bl:'border-bottom-left-radius'}; let cornerChanged=false;
    for(const [k,p] of Object.entries(cornerProps)){const rr=parseRadiusValue(map[p]);if(rr){next.radius[k]=rr.tl;cornerChanged=true;}}
    if(cornerChanged){next.radius.linked=next.radius.tl===next.radius.tr&&next.radius.tr===next.radius.br&&next.radius.br===next.radius.bl;if(!changed.includes('radius'))changed.push('radius');}
    if(map.border){const w=parseLengthPx(map.border); const c=(map.border.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i)||[])[1]; const pc=parseCssColor(c); if(w!=null)next.border.width=clamp(w,0,100); if(pc){next.border.color=pc.color;next.border.opacity=pc.opacity;} changed.push('border');}
    if(map['border-width']){const w=parseLengthPx(map['border-width']);if(w!=null){next.border.width=clamp(w,0,100);if(!changed.includes('border'))changed.push('border');}}
    if(map['border-color']){const pc=parseCssColor(map['border-color']);if(pc){next.border.color=pc.color;next.border.opacity=pc.opacity;if(!changed.includes('border'))changed.push('border');}}
    return {state:next,changed};
  }

  function applyCssImport() {
    const status=$('cssImportStatus'); const text=$('cssImportInput').value;
    if(!text.trim()){status.textContent='Paste a CSS/Figma style block first.';status.dataset.kind='warn';return;}
    try { const result=parseCssStyle(text); if(!result.changed.length){status.textContent='No supported properties found.';status.dataset.kind='warn';return;} state=result.state; syncInputsFromState(); status.textContent=`Applied: ${result.changed.join(', ')}.`; status.dataset.kind='ok'; }
    catch(err){status.textContent=`Could not parse: ${err.message}`;status.dataset.kind='error';}
  }
  $('applyCssBtn')?.addEventListener('click',applyCssImport); $('loadCssExampleBtn')?.addEventListener('click',()=>{$('cssImportInput').value=exampleCss;applyCssImport();}); $('cssImportInput')?.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();applyCssImport();}});

  function tagCssCode(){
    const t=state.tag;
    return `.tag-badge {
  display: inline-flex;
  align-items: center;
  width: max-content;
  min-height: ${fmt(t.minHeight)}px;
  padding: ${fmt(t.vPadding)}px ${fmt(t.hPadding+t.tipWidth)}px ${fmt(t.vPadding)}px ${fmt(t.hPadding)}px;
  background: ${t.bgColor};
  color: ${t.textColor};
  font-size: ${fmt(t.fontSize)}px;
  font-weight: ${fmt(t.fontWeight)};
  line-height: 1.2;
  white-space: nowrap;
  clip-path: polygon(0 0, calc(100% - ${fmt(t.tipWidth)}px) 0, 100% 50%, calc(100% - ${fmt(t.tipWidth)}px) 100%, 0 100%);
}`;
  }

  function tagUIKitCode(){
    const t=state.tag;
    return `import UIKit

final class TagBadgeView: UIView {
    private let titleLabel = UILabel()
    private let shapeLayer = CAShapeLayer()

    var text: String = ${JSON.stringify(t.text)} {
        didSet { titleLabel.text = text; invalidateIntrinsicContentSize() }
    }

    private let horizontalPadding: CGFloat = ${fmt(t.hPadding)}
    private let verticalPadding: CGFloat = ${fmt(t.vPadding)}
    private let tipWidth: CGFloat = ${fmt(t.tipWidth)}
    private let minimumHeight: CGFloat = ${fmt(t.minHeight)}

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        shapeLayer.fillColor = ${uiColor(t.bgColor,100)}.cgColor
        layer.insertSublayer(shapeLayer, at: 0)

        titleLabel.text = text
        titleLabel.textColor = ${uiColor(t.textColor,100)}
        titleLabel.font = .systemFont(ofSize: ${fmt(t.fontSize)}, weight: .${t.fontWeight >= 700 ? 'bold' : t.fontWeight >= 600 ? 'semibold' : t.fontWeight >= 500 ? 'medium' : 'regular'})
        titleLabel.numberOfLines = 1
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)
        titleLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        addSubview(titleLabel)

        NSLayoutConstraint.activate([
            titleLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: horizontalPadding),
            titleLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -(horizontalPadding + tipWidth)),
            titleLabel.centerYAnchor.constraint(equalTo: centerYAnchor),
            titleLabel.topAnchor.constraint(greaterThanOrEqualTo: topAnchor, constant: verticalPadding),
            titleLabel.bottomAnchor.constraint(lessThanOrEqualTo: bottomAnchor, constant: -verticalPadding)
        ])
    }

    override var intrinsicContentSize: CGSize {
        let textSize = titleLabel.intrinsicContentSize
        return CGSize(
            width: textSize.width + horizontalPadding * 2 + tipWidth,
            height: max(minimumHeight, textSize.height + verticalPadding * 2)
        )
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        shapeLayer.frame = bounds
        let path = UIBezierPath()
        path.move(to: .zero)
        path.addLine(to: CGPoint(x: bounds.maxX - tipWidth, y: 0))
        path.addLine(to: CGPoint(x: bounds.maxX, y: bounds.midY))
        path.addLine(to: CGPoint(x: bounds.maxX - tipWidth, y: bounds.maxY))
        path.addLine(to: CGPoint(x: 0, y: bounds.maxY))
        path.close()
        shapeLayer.path = path.cgPath
    }
}

// Usage with Auto Layout — intentionally NO width constraint.
let tagView = TagBadgeView()
tagView.text = ${JSON.stringify(t.text)}
tagView.translatesAutoresizingMaskIntoConstraints = false
containerView.addSubview(tagView)
NSLayoutConstraint.activate([
    tagView.topAnchor.constraint(equalTo: containerView.topAnchor),
    tagView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor)
])`;
  }

  function tagSwiftUICode(){
    const t=state.tag;
    return `import SwiftUI

struct TagTipShape: Shape {
    let tipWidth: CGFloat
    func path(in rect: CGRect) -> Path {
        Path { p in
            p.move(to: .zero)
            p.addLine(to: CGPoint(x: rect.maxX - tipWidth, y: 0))
            p.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
            p.addLine(to: CGPoint(x: rect.maxX - tipWidth, y: rect.maxY))
            p.addLine(to: CGPoint(x: 0, y: rect.maxY))
            p.closeSubpath()
        }
    }
}

Text(${JSON.stringify(t.text)})
    .font(.system(size: ${fmt(t.fontSize)}, weight: .${t.fontWeight >= 700 ? 'bold' : t.fontWeight >= 600 ? 'semibold' : t.fontWeight >= 500 ? 'medium' : 'regular'}))
    .foregroundStyle(${swiftUIColor(t.textColor,100)})
    .lineLimit(1)
    .fixedSize(horizontal: true, vertical: false)
    .padding(.vertical, ${fmt(t.vPadding)})
    .padding(.leading, ${fmt(t.hPadding)})
    .padding(.trailing, ${fmt(t.hPadding+t.tipWidth)})
    .frame(minHeight: ${fmt(t.minHeight)})
    .background(TagTipShape(tipWidth: ${fmt(t.tipWidth)}).fill(${swiftUIColor(t.bgColor,100)}))`;
  }

  function cssCode(){if(state.tag?.enabled)return tagCssCode();return `.background-card {\n  width: ${state.width}px;\n  height: ${state.height}px;\n  background: ${gradientCss()};\n  border-radius: ${borderRadiusCss()};\n  box-shadow: ${shadowCss()};\n  border: ${fmt(state.border.width)}px solid ${rgba(state.border.color,state.border.opacity)};\n}`;}
  function swiftUIColor(hex,opacity=100){const {r,g,b}=hexToRgb(hex);return `Color(red: ${(r/255).toFixed(4)}, green: ${(g/255).toFixed(4)}, blue: ${(b/255).toFixed(4)}, opacity: ${(clamp(opacity,0,100)/100).toFixed(3)})`;}
  function uiColor(hex,opacity=100){const {r,g,b}=hexToRgb(hex);return `UIColor(red: ${(r/255).toFixed(4)}, green: ${(g/255).toFixed(4)}, blue: ${(b/255).toFixed(4)}, alpha: ${(clamp(opacity,0,100)/100).toFixed(3)})`;}
  function gradientPoints(angle){const rad=(angle-90)*Math.PI/180,x=Math.cos(rad),y=Math.sin(rad);return{sx:+(0.5-x/2).toFixed(4),sy:+(0.5-y/2).toFixed(4),ex:+(0.5+x/2).toFixed(4),ey:+(0.5+y/2).toFixed(4)};}

  function uikitCode(){
    if(state.tag?.enabled)return tagUIKitCode();
    const stops=state.gradient.stops.slice().sort((a,b)=>a.position-b.position); const colors=stops.map(s=>`        ${uiColor(s.color,s.opacity)}.cgColor`).join(',\n'); const locs=stops.map(s=>(s.position/100).toFixed(4)).join(', ');
    const r=state.radius, equal=r.tl===r.tr&&r.tr===r.br&&r.br===r.bl; const p=gradientPoints(state.gradient.angle);
    const radiusMask=equal?`view.layer.cornerRadius = ${fmt(r.tl)}`:`let mask = CAShapeLayer()\nmask.path = makeRoundedRectPath(\n    rect: view.bounds,\n    topLeft: ${fmt(r.tl)}, topRight: ${fmt(r.tr)},\n    bottomRight: ${fmt(r.br)}, bottomLeft: ${fmt(r.bl)}\n)\nview.layer.mask = mask`;
    const gradient=state.gradient.type==='radial'?`// Pixel-accurate radial ellipse, including centers outside bounds.\nlet gradientLayer = EllipticalRadialGradientLayer()\ngradientLayer.frame = view.bounds\ngradientLayer.colors = [\n${colors}\n]\ngradientLayer.locations = [${locs}]\ngradientLayer.center = CGPoint(x: ${fmt(state.gradient.centerX/100,4)}, y: ${fmt(state.gradient.centerY/100,4)})\ngradientLayer.radius = CGSize(width: ${fmt(state.gradient.sizeX/100,4)}, height: ${fmt(state.gradient.sizeY/100,4)})\nview.layer.insertSublayer(gradientLayer, at: 0)`:`let gradientLayer = CAGradientLayer()\ngradientLayer.frame = view.bounds\ngradientLayer.colors = [\n${colors}\n]\ngradientLayer.locations = [${locs}]\ngradientLayer.type = .${state.gradient.type==='conic'?'conic':'axial'}\ngradientLayer.startPoint = CGPoint(x: ${p.sx}, y: ${p.sy})\ngradientLayer.endPoint = CGPoint(x: ${p.ex}, y: ${p.ey})\nview.layer.insertSublayer(gradientLayer, at: 0)`;
    const helper=(!equal||state.gradient.type==='radial')?`\n\n// Helpers\n${!equal?`func makeRoundedRectPath(rect: CGRect, topLeft: CGFloat, topRight: CGFloat, bottomRight: CGFloat, bottomLeft: CGFloat) -> CGPath {\n    let p = UIBezierPath()\n    let tl = min(topLeft, min(rect.width, rect.height) / 2)\n    let tr = min(topRight, min(rect.width, rect.height) / 2)\n    let br = min(bottomRight, min(rect.width, rect.height) / 2)\n    let bl = min(bottomLeft, min(rect.width, rect.height) / 2)\n    p.move(to: CGPoint(x: rect.minX + tl, y: rect.minY))\n    p.addLine(to: CGPoint(x: rect.maxX - tr, y: rect.minY))\n    p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY + tr), controlPoint: CGPoint(x: rect.maxX, y: rect.minY))\n    p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - br))\n    p.addQuadCurve(to: CGPoint(x: rect.maxX - br, y: rect.maxY), controlPoint: CGPoint(x: rect.maxX, y: rect.maxY))\n    p.addLine(to: CGPoint(x: rect.minX + bl, y: rect.maxY))\n    p.addQuadCurve(to: CGPoint(x: rect.minX, y: rect.maxY - bl), controlPoint: CGPoint(x: rect.minX, y: rect.maxY))\n    p.addLine(to: CGPoint(x: rect.minX, y: rect.minY + tl))\n    p.addQuadCurve(to: CGPoint(x: rect.minX + tl, y: rect.minY), controlPoint: CGPoint(x: rect.minX, y: rect.minY))\n    p.close()\n    return p.cgPath\n}`:''}${state.gradient.type==='radial'?`\n\nfinal class EllipticalRadialGradientLayer: CALayer {\n    var colors: [CGColor] = [] { didSet { setNeedsDisplay() } }\n    var locations: [CGFloat] = [] { didSet { setNeedsDisplay() } }\n    var center = CGPoint(x: 0.5, y: 0.5) { didSet { setNeedsDisplay() } }\n    var radius = CGSize(width: 1, height: 1) { didSet { setNeedsDisplay() } }\n    override func draw(in ctx: CGContext) {\n        guard let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors as CFArray, locations: locations) else { return }\n        let c = CGPoint(x: bounds.width * center.x, y: bounds.height * center.y)\n        let rx = max(0.0001, bounds.width * radius.width)\n        let ry = max(0.0001, bounds.height * radius.height)\n        ctx.saveGState()\n        ctx.translateBy(x: c.x, y: c.y)\n        ctx.scaleBy(x: rx, y: ry)\n        ctx.drawRadialGradient(gradient, startCenter: .zero, startRadius: 0, endCenter: .zero, endRadius: 1, options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])\n        ctx.restoreGState()\n    }\n}`:''}`:'';
    return `import UIKit\n\n${gradient}\n\n${radiusMask}\n\nview.layer.borderWidth = ${fmt(state.border.width)}\nview.layer.borderColor = ${uiColor(state.border.color,state.border.opacity)}.cgColor\nview.layer.shadowColor = ${uiColor(state.shadow.color,100)}.cgColor\nview.layer.shadowOpacity = ${fmt(state.shadow.enabled?state.shadow.opacity/100:0,3)}\nview.layer.shadowOffset = CGSize(width: ${fmt(state.shadow.x)}, height: ${fmt(state.shadow.y)})\nview.layer.shadowRadius = ${fmt(state.shadow.blur/2)}${helper}`;
  }

  function swiftuiCode(){
    if(state.tag?.enabled)return tagSwiftUICode();
    const stops=state.gradient.stops.slice().sort((a,b)=>a.position-b.position).map(s=>`.init(color: ${swiftUIColor(s.color,s.opacity)}, location: ${fmt(s.position/100,4)})`).join(',\n            ');
    const r=state.radius, equal=r.tl===r.tr&&r.tr===r.br&&r.br===r.bl; const shape=equal?`RoundedRectangle(cornerRadius: ${fmt(r.tl)}, style: .continuous)`:`UnevenRoundedRectangle(topLeadingRadius: ${fmt(r.tl)}, bottomLeadingRadius: ${fmt(r.bl)}, bottomTrailingRadius: ${fmt(r.br)}, topTrailingRadius: ${fmt(r.tr)}, style: .continuous)`;
    const fill=state.gradient.type==='linear'?`LinearGradient(gradient: Gradient(stops: [\n            ${stops}\n        ]), startPoint: .topLeading, endPoint: .bottomTrailing)`:`// SwiftUI native ${state.gradient.type} gradient. Elliptical radial size is represented exactly in CSS/export; use Canvas/custom shader for pixel-identical iOS output.\nRadialGradient(gradient: Gradient(stops: [\n            ${stops}\n        ]), center: UnitPoint(x: ${fmt(state.gradient.centerX/100,4)}, y: ${fmt(state.gradient.centerY/100,4)}), startRadius: 0, endRadius: ${fmt(Math.max(state.width*state.gradient.sizeX/100,state.height*state.gradient.sizeY/100))})`;
    return `import SwiftUI\n\n${shape}\n    .fill(${fill})\n    .overlay(${shape}.stroke(${swiftUIColor(state.border.color,state.border.opacity)}, lineWidth: ${fmt(state.border.width)}))\n    .shadow(color: ${swiftUIColor(state.shadow.color,state.shadow.enabled?state.shadow.opacity:0)}, radius: ${fmt(state.shadow.blur/2)}, x: ${fmt(state.shadow.x)}, y: ${fmt(state.shadow.y)})`;
  }

  function updateCode(){const map={css:cssCode,uikit:uikitCode,swiftui:swiftuiCode}; $('codeOutput').textContent=map[activeCode](); $('codeTitle').textContent=activeCode==='css'?'CSS':activeCode==='uikit'?'UIKit':'SwiftUI';}
  document.querySelectorAll('.code-tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.code-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeCode=b.dataset.code;updateCode();}));
  $('copyCodeBtn')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('codeOutput').textContent);$('copyCodeBtn').textContent='Copied';setTimeout(()=>$('copyCodeBtn').textContent='Copy code',1000);}catch{$('copyCodeBtn').textContent='Select & copy';}});

  function roundedPathData(x,y,w,h,r){
    const max=Math.min(w,h)/2, tl=clamp(r.tl,0,max),tr=clamp(r.tr,0,max),br=clamp(r.br,0,max),bl=clamp(r.bl,0,max);
    return `M ${x+tl} ${y} H ${x+w-tr} Q ${x+w} ${y} ${x+w} ${y+tr} V ${y+h-br} Q ${x+w} ${y+h} ${x+w-br} ${y+h} H ${x+bl} Q ${x} ${y+h} ${x} ${y+h-bl} V ${y+tl} Q ${x} ${y} ${x+tl} ${y} Z`;
  }

  function tagSvgMarkup(scale=1){
    const t=state.tag, size=measureTagSize();
    const sh=state.shadow;
    const pad=sh.enabled?Math.ceil(sh.blur*1.5+Math.max(Math.abs(sh.x),Math.abs(sh.y))):0;
    const W=size.width+pad*2,H=size.height+pad*2,x=pad,y=pad;
    const points=`${x},${y} ${x+size.width-t.tipWidth},${y} ${x+size.width},${y+size.height/2} ${x+size.width-t.tipWidth},${y+size.height} ${x},${y+size.height}`;
    const filter=sh.enabled?`<filter id="tagShadow" x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="${sh.x}" dy="${sh.y}" stdDeviation="${sh.blur/2}" flood-color="${sh.color}" flood-opacity="${sh.opacity/100}"/></filter>`:'';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W*scale}" height="${H*scale}" viewBox="0 0 ${W} ${H}"><defs>${filter}</defs><polygon points="${points}" fill="${t.bgColor}" ${sh.enabled?'filter="url(#tagShadow)"':''}/><text x="${x+t.hPadding}" y="${y+size.height/2}" fill="${t.textColor}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="${t.fontSize}" font-weight="${t.fontWeight}" dominant-baseline="middle">${escapeXml(t.text)}</text></svg>`;
  }

  function svgMarkup(scale=1) {
    if(state.tag?.enabled)return tagSvgMarkup(scale);
    const s=state, pad=s.shadow.enabled?Math.ceil(Math.max(0,s.shadow.blur*1.5+Math.abs(s.shadow.x)+Math.max(0,s.shadow.spread),s.shadow.blur*1.5+Math.abs(s.shadow.y)+Math.max(0,s.shadow.spread))):0;
    const W=s.width+pad*2,H=s.height+pad*2,x=pad,y=pad; const gid='g',fid='shadow'; const stops=s.gradient.stops.slice().sort((a,b)=>a.position-b.position).map(v=>`<stop offset="${v.position}%" stop-color="${v.color}" stop-opacity="${v.opacity/100}"/>`).join('');
    let grad;
    if(s.gradient.type==='radial'){const cx=x+s.width*s.gradient.centerX/100,cy=y+s.height*s.gradient.centerY/100,rx=s.width*s.gradient.sizeX/100,ry=s.height*s.gradient.sizeY/100;grad=`<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${cx} ${cy}) scale(${rx} ${ry})">${stops}</radialGradient>`;}
    else if(s.gradient.type==='linear'){const a=(s.gradient.angle-90)*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),cx=x+s.width/2,cy=y+s.height/2,len=Math.abs(s.width*dx)+Math.abs(s.height*dy);grad=`<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${cx-dx*len/2}" y1="${cy-dy*len/2}" x2="${cx+dx*len/2}" y2="${cy+dy*len/2}">${stops}</linearGradient>`;}
    else {grad=`<radialGradient id="${gid}">${stops}</radialGradient>`;}
    const shadow=s.shadow.enabled?`<filter id="${fid}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceAlpha" stdDeviation="${s.shadow.blur/2}" result="blur"/><feOffset dx="${s.shadow.x}" dy="${s.shadow.y}" result="off"/><feFlood flood-color="${s.shadow.color}" flood-opacity="${s.shadow.opacity/100}" result="flood"/><feComposite in="flood" in2="off" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`:'';
    const path=roundedPathData(x,y,s.width,s.height,s.radius); const border=s.border.width>0?`stroke="${s.border.color}" stroke-opacity="${s.border.opacity/100}" stroke-width="${s.border.width}"`:'';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W*scale}" height="${H*scale}" viewBox="0 0 ${W} ${H}"><defs>${grad}${shadow}</defs><path d="${path}" fill="url(#${gid})" ${border} ${s.shadow.enabled?`filter="url(#${fid})"`:''}/></svg>`;
  }

  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
  async function rasterBlob(format,scale,quality){const svg=svgMarkup(scale);const img=new Image();const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url;});const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');if(format==='jpeg'){ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,c.width,c.height);}ctx.drawImage(img,0,0);URL.revokeObjectURL(url);const mime=format==='webp'?'image/webp':format==='jpeg'?'image/jpeg':'image/png';return await new Promise(resolve=>c.toBlob(resolve,mime,quality));}
  $('downloadImageBtn')?.addEventListener('click',async()=>{const status=$('exportStatus'),format=$('exportFormatInput').value,scale=+($('exportScaleInput').value||1),quality=clamp($('jpegQualityInput').value,10,100)/100;status.textContent='Preparing export…';try{if(format==='svg'){downloadBlob(new Blob([svgMarkup(1)],{type:'image/svg+xml'}),'background.svg');}else if(format==='pdf'){const blob=await rasterBlob('png',scale,1);const data=await blob.arrayBuffer();const base64=btoa(String.fromCharCode(...new Uint8Array(data)));const {jsPDF}=window.jspdf||{};if(!jsPDF)throw new Error('PDF library unavailable');const doc=new jsPDF({orientation:state.width>=state.height?'landscape':'portrait',unit:'px',format:[state.width,state.height]});doc.addImage('data:image/png;base64,'+base64,'PNG',0,0,state.width,state.height);doc.save('background.pdf');}else{const blob=await rasterBlob(format,scale,quality);if(!blob)throw new Error(`${format.toUpperCase()} is not supported by this browser`);downloadBlob(blob,`background.${format==='jpeg'?'jpg':format}`);}status.textContent='Export complete.';}catch(err){status.textContent=`Export failed: ${err.message}`;}});

  function renderPresets(){const wrap=$('presetList');wrap.innerHTML='';const custom=JSON.parse(localStorage.getItem('bgStudioPresets')||'{}');Object.entries({...builtInPresets,...custom}).forEach(([name,preset])=>{const b=document.createElement('button');b.className='preset-chip';b.textContent=name;b.addEventListener('click',()=>{state=deepCopy(preset);syncInputsFromState();});wrap.appendChild(b);});}
  $('savePresetBtn')?.addEventListener('click',()=>{const name=prompt('Preset name');if(!name)return;const custom=JSON.parse(localStorage.getItem('bgStudioPresets')||'{}');custom[name]=state;localStorage.setItem('bgStudioPresets',JSON.stringify(custom));renderPresets();});
  $('exportJsonBtn')?.addEventListener('click',()=>downloadBlob(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'background-preset.json'));
  $('importJsonInput')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const parsed=JSON.parse(await f.text());state={...deepCopy(defaults),...parsed,gradient:{...deepCopy(defaults.gradient),...(parsed.gradient||{})},radius:{...deepCopy(defaults.radius),...(parsed.radius||{})},shadow:{...deepCopy(defaults.shadow),...(parsed.shadow||{})},border:{...deepCopy(defaults.border),...(parsed.border||{})},tag:{...deepCopy(defaults.tag),...(parsed.tag||{})}};syncInputsFromState();}catch{alert('Invalid preset JSON');}e.target.value='';});
  $('randomBtn')?.addEventListener('click',()=>{const rand=()=>`#${Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0').toUpperCase()}`;state.gradient.stops=[{color:rand(),opacity:100,position:0},{color:rand(),opacity:100,position:50},{color:rand(),opacity:100,position:100}];state.gradient.angle=Math.round(Math.random()*360);renderStops();updatePreview();});
  $('resetBtn')?.addEventListener('click',()=>{state=deepCopy(defaults);syncInputsFromState();});
  document.querySelectorAll('.preview-mode').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.preview-mode').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('previewStage').className='preview-stage '+b.dataset.bg;}));

  window.__backgroundStudio = { parseCssStyle, getState:()=>deepCopy(state), exampleCss };
  renderPresets(); syncInputsFromState();
})();
