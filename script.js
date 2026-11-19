(function(){
  'use strict';
  // Designed to be hosted as a static page on GitHub Pages and embedded on Superhive.
  // All scatter/camera demos are illustrations; this code does not execute Blender logic.
  const params=new URLSearchParams(location.search);
  if(params.get('embed')==='1'){
    document.body.classList.add('embed-mode');
    const section=params.get('section');
    if(section){document.body.dataset.section=section;const target=document.getElementById(section);if(target)target.classList.add('is-embedded');else document.querySelectorAll('.page-section').forEach(e=>e.classList.add('is-embedded'));}
    else document.querySelectorAll('.page-section').forEach(e=>e.classList.add('is-embedded'));
  }
  document.querySelectorAll('.filter-chip').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter-chip').forEach(b=>{b.classList.toggle('selected',b===btn);b.setAttribute('aria-pressed',String(b===btn));});
    document.querySelectorAll('.asset-card').forEach(card=>card.classList.toggle('hidden',btn.dataset.filter!=='all'&&card.dataset.type!==btn.dataset.filter));
  }));
  const stage=document.getElementById('scatter-stage');
  const coverage=document.getElementById('scatter-coverage');
  const instances=document.getElementById('scatter-instances');
  const brushLayer=document.getElementById('scatter-brush');
  const density=document.getElementById('density');
  const densityValue=document.getElementById('density-value');
  const mix=document.getElementById('asset-mix');
  const instanceCount=document.getElementById('instance-count');
  const modeHint=document.getElementById('mode-hint');
  const tools=document.querySelectorAll('.tool-btn');
  let mode='area',seed=21,brushMarks=[],painting=false;
  function rng(s){return function(){s|=0;s=(s+0x6D2B79F5)|0;var t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
  function isInsideSurface(x,y){return x>30+(y-95)*.14&&x<620+(y-90)*.23&&y>95-x*.04&&y<413-(x-40)*.07;}
  function isInsideCoverage(x,y){
    if(mode==='whole')return true;
    if(mode==='area'){const dx=(x-310)/215,dy=(y-247)/107;return dx*dx+dy*dy<1;}
    if(mode==='path')return Math.abs(y-(227+43*Math.sin((x-70)*.008)))<38;
    return brushMarks.some(m=>(x-m.x)**2+(y-m.y)**2<=(m.r||48)**2);
  }
  function markupForAsset(x,y,kind,size,random){
    let s=size.toFixed(2);
    if(kind==='stone')return '<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') scale('+s+')"><path d="M-8 2-5-5 3-7 10-1 7 5-4 7Z" fill="#8d9180" stroke="#b9bbab" stroke-width=".7"/><path d="M-5-5 3-7 1 1-8 2Z" fill="#cad0b6" opacity=".32"/></g>';
    if(kind==='twig')return '<path d="M'+(x-8).toFixed(1)+' '+(y+3).toFixed(1)+'l18-8m-6 3-2-7" fill="none" stroke="#b38a60" stroke-width="'+(1.3*s).toFixed(1)+'" stroke-linecap="round"/>';
    if(kind==='flower'){const col=random>.55?'#f0e5ca':'#b7b8e9';return '<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') scale('+s+')"><path d="M0 4V-10M0-3l-6-3m6 4 5-6" stroke="#90c66a" stroke-width="1.4" fill="none"/><g fill="'+col+'"><circle cx="0" cy="-13" r="4"/><circle cx="-4" cy="-10" r="4"/><circle cx="4" cy="-10" r="4"/><circle cy="-7" r="4"/></g><circle cy="-10" r="2.6" fill="#e9c657"/></g>';}
    return '<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') scale('+s+')" fill="none" stroke-linecap="round"><path d="M0 3Q-12-7-12-14M0 3Q-5-11 0-25M0 3Q9-15 15-18M0 3Q4-13-4-18M0 3Q14-5 19-8" stroke="'+(random>.55?'#afd578':'#77ac60')+'" stroke-width="2"/><path d="M0 3Q-6-9 4-17M0 3Q-11-3-17-7" stroke="#c4d58b" stroke-width="1.5"/></g>';
  }
  function paintCoverage(){
    if(mode==='area')coverage.innerHTML='<ellipse cx="310" cy="247" rx="215" ry="107" fill="#c6fa67" fill-opacity=".095" stroke="#d1ff7f" stroke-width="2.2" stroke-dasharray="9 6"/>';
    if(mode==='path')coverage.innerHTML='<path d="M65 250Q185 145 320 244T640 250" stroke="#c6fa67" stroke-opacity=".22" stroke-width="76" fill="none"/><path d="M65 250Q185 145 320 244T640 250" stroke="#d1ff7f" stroke-width="2.2" stroke-dasharray="9 5" fill="none"/>';
    if(mode==='whole')coverage.innerHTML='<path d="M28 110 615 80 694 376 88 409Z" fill="#c6fa67" fill-opacity=".12" stroke="#c6fa67" stroke-width="2" stroke-dasharray="9 6"/>';
    if(mode==='brush')coverage.innerHTML=brushMarks.map(m=>'<circle cx="'+m.x+'" cy="'+m.y+'" r="'+m.r+'" fill="#c6fa67" fill-opacity=".11"/>').join('');
    brushLayer.innerHTML=mode==='brush'?brushMarks.map(m=>'<circle cx="'+m.x+'" cy="'+m.y+'" r="'+m.r+'" stroke="#c6fa67" stroke-opacity=".33" stroke-dasharray="4 6" fill="none"/>').join(''):'';
  }
  function redraw(){
    const rand=rng(seed);
    const max=Math.round(Number(density.value)*3.2);
    densityValue.textContent=density.value+'%';
    let out=[],count=0;
    for(let i=0;i<max*3;i++){
      const x=25+rand()*675,y=95+rand()*314;
      if(!isInsideSurface(x,y)||!isInsideCoverage(x,y))continue;
      const choice=rand();let kind;
      if(mix.value==='grass')kind='grass';
      else if(mix.value==='flowers')kind=choice<.5?'flower':'grass';
      else if(mix.value==='stones')kind=choice<.65?'stone':'twig';
      else kind=choice<.67?'grass':choice<.83?'flower':choice<.94?'stone':'twig';
      const sz=.6+rand()*.75;
      out.push(markupForAsset(x,y,kind,sz,rand()));count++;
      if(count>=max)break;
    }
    instances.innerHTML=out.join('');
    instanceCount.textContent=count;
    paintCoverage();
  }
  const hint={area:'AREA · draw a closed region',path:'PATH · follow a strip',brush:'BRUSH · drag on the surface to paint',whole:'WHOLE MESH · cover the entire mesh'};
  tools.forEach(b=>b.addEventListener('click',()=>{
    mode=b.dataset.tool;
    tools.forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-pressed',String(t===b));});
    modeHint.textContent=hint[mode];
    if(mode==='brush'&&!brushMarks.length)brushMarks=[{x:230,y:240,r:70},{x:324,y:246,r:74},{x:408,y:279,r:65}];
    redraw();
  }));
  density.addEventListener('input',redraw);
  mix.addEventListener('change',redraw);
  document.getElementById('rebuild').addEventListener('click',()=>{seed+=101;redraw();});
  function pointForEvent(e){const r=stage.getBoundingClientRect();return {x:(e.clientX-r.left)*700/r.width,y:(e.clientY-r.top)*430/r.height};}
  function onBrush(e){if(mode!=='brush'||!painting)return;const p=pointForEvent(e);if(!isInsideSurface(p.x,p.y))return;const last=brushMarks[brushMarks.length-1];if(!last||Math.hypot(last.x-p.x,last.y-p.y)>20){brushMarks.push({x:p.x,y:p.y,r:52});if(brushMarks.length>55)brushMarks.shift();seed+=1;redraw();}}
  stage.addEventListener('pointerdown',e=>{if(mode!=='brush')return;painting=true;stage.setPointerCapture(e.pointerId);onBrush(e);});
  stage.addEventListener('pointermove',onBrush);
  ['pointerup','pointercancel','lostpointercapture'].forEach(evt=>stage.addEventListener(evt,()=>{painting=false;}));
  redraw();

  const cameraScene=document.getElementById('camera-scene');
  const cameraElements=document.getElementById('camera-elements');
  const cameraToggle=document.getElementById('camera-toggle');
  const cameraState=document.getElementById('camera-state');
  const rand=rng(718);
  let cameraHTML='';
  for(let i=0;i<115;i++){const x=rand()*100,y=rand()*85+12;cameraHTML+='<span class="camera-blade '+(x<28||x>72?'outside':'')+'" style="left:'+x.toFixed(1)+'%;top:'+y.toFixed(1)+'%;font-size:'+(12+rand()*20).toFixed(0)+'px">♣</span>';}
  cameraElements.innerHTML=cameraHTML;
  cameraToggle.addEventListener('change',()=>{cameraScene.classList.toggle('optimized',cameraToggle.checked);cameraState.textContent=cameraToggle.checked?'PREVIEW: CAMERA-FOCUSED':'PREVIEW: FULL SCENE';});
  const languages={
    en:['Source Meshes','Density','Coverage Mode','Adjust distribution and rebuild your scatter.'],
    pt:['Malhas de Origem','Densidade','Modo de Cobertura','Ajuste a distribuição e reconstrua a dispersão.'],
    de:['Quell-Meshes','Dichte','Abdeckungsmodus','Verteilung anpassen und Streuung neu erstellen.'],
    ja:['ソースメッシュ','密度','カバレッジモード','分布を調整して散布を再構築します。'],
    es:['Mallas de Origen','Densidad','Modo de Cobertura','Ajusta la distribución y reconstruye la dispersión.'],
    fr:['Maillages Sources','Densité','Mode de Couverture','Ajustez la distribution et reconstruisez la dispersion.'],
    zh:['源网格','密度','覆盖模式','调整分布并重新生成散布。'],
    ru:['Исходные меши','Плотность','Режим покрытия','Настройте распределение и перестройте рассеивание.']
  };
  const labels=['translated-sources-label','translated-density-label','translated-coverage-label','translated-help'].map(id=>document.getElementById(id));
  document.querySelectorAll('.lang-btn').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.lang-btn').forEach(b=>{b.classList.toggle('selected',b===btn);b.setAttribute('aria-pressed',String(b===btn));});
    const translations=languages[btn.dataset.lang]||languages.en;
    labels.forEach((target,i)=>{target.textContent=translations[i];});
  }));
})();