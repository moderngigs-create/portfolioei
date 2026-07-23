(function(){
  var root=document.documentElement;
  root.classList.add('js');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- robust anchor scrolling ----
     CSS scroll-behavior is left "auto" on purpose: the browser's automatic jump-to-hash
     on initial load can get interrupted by late layout shifts (web fonts, lazy images)
     when scroll-behavior is "smooth", leaving the page stuck near the top. Instead we:
     1) let the native initial jump be instant (reliable), then correct it once more
        after everything (incl. images) has finished loading;
     2) handle in-page anchor clicks ourselves with an explicit smooth scrollIntoView,
        which is safe because by click time the layout has already settled. */
  function scrollToHash(smooth){
    if(!location.hash || location.hash.length<2) return;
    var target=null;
    try{ target=document.querySelector(location.hash); }catch(e){}
    if(!target) return;
    target.scrollIntoView({behavior: smooth?'smooth':'auto', block:'start'});
  }
  addEventListener('load', function(){ scrollToHash(false); });

  document.addEventListener('click', function(e){
    var a=e.target.closest('a[href^="#"]');
    if(!a) return;
    var id=a.getAttribute('href');
    if(!id || id.length<2) return;
    var target=null;
    try{ target=document.querySelector(id); }catch(err){}
    if(!target) return;
    e.preventDefault();
    target.scrollIntoView({behavior: reduce?'auto':'smooth', block:'start'});
    if(history.pushState) history.pushState(null,'',id);
  });

  /* ---- theme ---- */
  var KEY='ei-theme', saved=null;
  try{saved=localStorage.getItem(KEY)}catch(e){}
  if(saved!=='dark'&&saved!=='light')saved='light';      // светлая по умолчанию
  root.setAttribute('data-theme',saved);
  function syncThemeColor(){
    var m=document.querySelector('meta[name="theme-color"]'); if(!m)return;
    m.setAttribute('content',root.getAttribute('data-theme')==='dark'?'#151412':'#F4EEE4');
  }
  syncThemeColor();
  document.addEventListener('click',function(e){
    var t=e.target.closest('#themeToggle'); if(!t)return;
    var next=root.getAttribute('data-theme')==='dark'?'light':'dark';
    root.setAttribute('data-theme',next);
    syncThemeColor();
    try{localStorage.setItem(KEY,next)}catch(err){}
  });

  /* ---- broken-image fallback → styled placeholder ---- */
  function placehold(img){
    if(img.dataset.phed)return; img.dataset.phed='1';
    var ph=document.createElement('div'); ph.className='img-ph';
    var label=img.getAttribute('alt')||'Скриншот интерфейса';
    ph.innerHTML='<span>Скриншот кейса: '+label.replace(/[<>]/g,'')+'</span>';
    var frame=img.closest('.frame'); if(frame)frame.classList.add('is-ph');
    if(img.parentNode)img.parentNode.replaceChild(ph,img);
  }
  function watchImages(){
    document.querySelectorAll('img').forEach(function(img){
      if(img.dataset.phwatch)return; img.dataset.phwatch='1';
      img.addEventListener('error',function(){placehold(img)});
      // мгновенная замена только для НЕ-lazy картинок, которые уже пытались
      // загрузиться и провалились (у lazy complete=true до старта загрузки — их не трогаем)
      if(img.getAttribute('loading')!=='lazy'&&img.complete&&img.naturalWidth===0){placehold(img);}
    });
  }
  watchImages();

  document.addEventListener('DOMContentLoaded',init);
  if(document.readyState!=='loading')init();
  var started=false;
  function init(){
    if(started)return; started=true;

    /* ---- progress bar ---- */
    var pb=document.createElement('div'); pb.id='progress'; document.body.appendChild(pb);
    function onScroll(){var d=root.scrollHeight-root.clientHeight; pb.style.width=(d>0?root.scrollTop/d*100:0)+'%';}
    addEventListener('scroll',onScroll,{passive:true}); onScroll();

    /* ---- reveal on scroll (fail-safe: hidden only via html.js) ---- */
    if(!reduce){
      var rev=document.querySelectorAll('.section-head,.stat,.svc,.exp-item,figure,.hyp .card,.result-strip,'+
        '.about-grid>div,.case-section>.snum,.case-section>h2,.case-section>p,.insight-list,.filters,.cases-grid,'+
        '.case-hero .kicker,.case-hero h1,.case-hero .sub,.case-cover,.case-meta>div,.lead-label');
      rev.forEach(function(e){e.classList.add('reveal')});
      var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}})},{threshold:.1});
      rev.forEach(function(e){io.observe(e)});
      // safety net: reveal everything after 4s in case an observer misses
      setTimeout(function(){rev.forEach(function(e){e.classList.add('in')})},4000);
    }

    /* ---- count-up ---- */
    function countUp(el){
      var m=el.textContent.trim().match(/^(\D*)(\d+(?:[\s ]\d{3})+|\d+)(.*)$/);
      if(!m)return; var pre=m[1], num=parseInt(m[2].replace(/[\s ]/g,''),10), suf=m[3];
      if(!isFinite(num))return; var t0=null;
      (function step(ts){if(!t0)t0=ts; var p=Math.min((ts-t0)/900,1);
        var v=Math.round(num*(1-Math.pow(1-p,3)));
        el.textContent=pre+v.toLocaleString('ru-RU')+suf; if(p<1)requestAnimationFrame(step);})(performance.now());
    }
    var io2=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){countUp(x.target);io2.unobserve(x.target);}})},{threshold:.6});
    document.querySelectorAll('.stat .num').forEach(function(n){io2.observe(n)});

    /* ---- scroll-spy (nav links + toc links) ---- */
    var spyLinks=[].concat([].slice.call(document.querySelectorAll('nav.links a[href^="#"]')),
                           [].slice.call(document.querySelectorAll('.toc a[href^="#"]')));
    if(spyLinks.length){
      var targets=spyLinks.map(function(a){return document.querySelector(a.getAttribute('href'))}).filter(Boolean);
      var io3=new IntersectionObserver(function(es){es.forEach(function(x){
        if(x.isIntersecting)spyLinks.forEach(function(a){a.classList.toggle('active',a.getAttribute('href')==='#'+x.target.id)});
      })},{rootMargin:'-45% 0px -50% 0px'});
      targets.forEach(function(s){io3.observe(s)});
    }

    /* ---- lightbox ---- */
    var lb=document.createElement('div'); lb.id='lb'; lb.setAttribute('aria-hidden','true');
    lb.innerHTML='<span class="lb-count"></span>'+
      '<span class="lb-zoomlvl"></span>'+
      '<button class="lb-close" aria-label="Закрыть">✕</button>'+
      '<button class="lb-prev" aria-label="Предыдущее">‹</button>'+
      '<button class="lb-next" aria-label="Следующее">›</button>'+
      '<img class="lb-img" alt="">'+
      '<div class="lb-cap"></div>'+
      '<div class="lb-hint">Колесо мыши или трекпад — приблизить · перетащите фото, чтобы сдвинуть</div>';
    document.body.appendChild(lb);
    var lbImg=lb.querySelector('.lb-img'), lbCap=lb.querySelector('.lb-cap'), lbCount=lb.querySelector('.lb-count');
    var lbZoomLvl=lb.querySelector('.lb-zoomlvl'), lbHint=lb.querySelector('.lb-hint');
    var gal=[], gi=0;

    /* continuous zoom + pan state (replaces the old binary fit/100% toggle) */
    var scale=1, panX=0, panY=0, dragging=false, dragged=false,
        dragStartX=0, dragStartY=0, dragPanX=0, dragPanY=0;

    function renderZoom(){
      lbImg.style.transform='translate('+panX+'px,'+panY+'px) scale('+scale+')';
      lbImg.classList.toggle('zoomed', scale>1);
      lbZoomLvl.style.display = scale>1 ? '' : 'none';
      lbZoomLvl.textContent = Math.round(scale*100)+'%';
    }
    function clampPan(){
      var w=lbImg.offsetWidth*scale, h=lbImg.offsetHeight*scale;
      var maxX=Math.max(0,(w-innerWidth)/2), maxY=Math.max(0,(h-innerHeight)/2);
      panX=Math.min(maxX,Math.max(-maxX,panX)); panY=Math.min(maxY,Math.max(-maxY,panY));
    }
    function setZoom(target,clientX,clientY){
      target=Math.min(4,Math.max(1,target));
      if(target===scale)return;
      var cx=innerWidth/2, cy=innerHeight/2, Px=clientX-cx, Py=clientY-cy;
      var Qx=(Px-panX)/scale, Qy=(Py-panY)/scale;
      panX=Px-target*Qx; panY=Py-target*Qy; scale=target;
      if(scale===1){panX=0;panY=0;}
      clampPan(); renderZoom();
    }
    function resetZoom(){scale=1;panX=0;panY=0;lbImg.style.transition='';renderZoom();}

    function show(){var im=gal[gi]; lbImg.src=im.dataset.full||im.src; var fig=im.closest('figure'); var fc=fig?fig.querySelector('figcaption'):null;
      lbCap.textContent=fc?fc.textContent:(im.alt||''); lbCount.textContent=(gi+1)+' / '+gal.length; resetZoom();}
    function open(img){var scope=img.closest('.case-main')||img.closest('section')||document;
      gal=[].slice.call(scope.querySelectorAll('.frame img')); gi=gal.indexOf(img); if(gi<0){gal=[img];gi=0;}
      show(); lb.classList.add('open'); document.body.style.overflow='hidden'; maybeShowHint();}
    function close(){lb.classList.remove('open'); document.body.style.overflow=''; lbImg.src=''; resetZoom();}
    function nav(d){gi=(gi+d+gal.length)%gal.length; show();}

    var HINT_KEY='ei-lb-hint-seen';
    function maybeShowHint(){
      var seen=null; try{seen=localStorage.getItem(HINT_KEY)}catch(e){}
      if(seen)return;
      lbHint.classList.add('show');
      setTimeout(function(){lbHint.classList.remove('show')},3500);
      try{localStorage.setItem(HINT_KEY,'1')}catch(e){}
    }

    document.querySelectorAll('.frame img').forEach(function(img){img.closest('.frame').addEventListener('click',function(){open(img)})});
    lb.querySelector('.lb-close').onclick=close;
    lb.querySelector('.lb-prev').onclick=function(e){e.stopPropagation();nav(-1)};
    lb.querySelector('.lb-next').onclick=function(e){e.stopPropagation();nav(1)};
    lb.onclick=function(e){if(e.target===lb)close()};

    /* wheel / trackpad — smooth continuous zoom centred on the cursor */
    lb.addEventListener('wheel',function(e){
      if(!lb.classList.contains('open'))return;
      e.preventDefault();
      var factor=Math.pow(1.0018,-e.deltaY);
      setZoom(scale*factor,e.clientX,e.clientY);
    },{passive:false});

    /* drag to pan once zoomed in; plain click (no drag) toggles a quick 1x/2x jump */
    lbImg.addEventListener('mousedown',function(e){
      if(scale<=1)return;
      dragging=true; dragged=false; dragStartX=e.clientX; dragStartY=e.clientY;
      dragPanX=panX; dragPanY=panY; lbImg.classList.add('dragging'); e.preventDefault();
    });
    addEventListener('mousemove',function(e){
      if(!dragging)return;
      var dx=e.clientX-dragStartX, dy=e.clientY-dragStartY;
      if(Math.abs(dx)>3||Math.abs(dy)>3)dragged=true;
      panX=dragPanX+dx; panY=dragPanY+dy; clampPan(); renderZoom();
    });
    addEventListener('mouseup',function(){if(dragging){dragging=false; lbImg.classList.remove('dragging');}});
    lbImg.addEventListener('click',function(e){
      e.stopPropagation();
      if(dragged){dragged=false;return;}
      lbImg.style.transition='transform .28s ease';
      setZoom(scale>1?1:2,e.clientX,e.clientY);
      setTimeout(function(){lbImg.style.transition=''},300);
    });

    addEventListener('keydown',function(e){if(!lb.classList.contains('open'))return;
      if(e.key==='Escape')close();
      else if(e.key==='ArrowLeft'&&scale===1)nav(-1);
      else if(e.key==='ArrowRight'&&scale===1)nav(1);
      else if(e.key==='+'||e.key==='=')setZoom(scale+.4,innerWidth/2,innerHeight/2);
      else if(e.key==='-')setZoom(scale-.4,innerWidth/2,innerHeight/2);});

    /* ---- mobile burger menu ---- */
    var burger=document.getElementById('burger');
    if(burger){
      var overlay=document.querySelector('.menu-overlay');
      function setMenu(open){document.body.classList.toggle('menu-open',open);
        burger.setAttribute('aria-expanded',open?'true':'false');}
      burger.addEventListener('click',function(){setMenu(!document.body.classList.contains('menu-open'))});
      if(overlay)overlay.addEventListener('click',function(){setMenu(false)});
      document.querySelectorAll('.mobile-menu a').forEach(function(a){a.addEventListener('click',function(){setMenu(false)})});
      addEventListener('keydown',function(e){if(e.key==='Escape')setMenu(false)});
    }

    /* ---- case filters (landing) ---- */
    var grid=document.querySelector('.cases-grid');
    var chips=document.querySelectorAll('.chip'), cards=document.querySelectorAll('.case-card');
    chips.forEach(function(chip){chip.addEventListener('click',function(){
      chips.forEach(function(c){c.classList.remove('active');c.setAttribute('aria-pressed','false')});
      chip.classList.add('active'); chip.setAttribute('aria-pressed','true');
      var f=chip.dataset.filter, shown=0;
      cards.forEach(function(card){
        var vis=(f==='all'||(card.dataset.cat||'').indexOf(f)>-1);
        card.style.display=vis?'':'none'; if(vis)shown++;
      });
      if(grid)grid.classList.toggle('is-empty',shown===0);
    })});
  }
})();
