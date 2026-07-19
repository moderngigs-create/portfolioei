(function(){
  var root=document.documentElement;
  root.classList.add('js');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      '<button class="lb-close" aria-label="Закрыть">✕</button>'+
      '<button class="lb-prev" aria-label="Предыдущее">‹</button>'+
      '<button class="lb-next" aria-label="Следующее">›</button>'+
      '<img class="lb-img" alt="">'+
      '<div class="lb-cap"></div>';
    document.body.appendChild(lb);
    var lbImg=lb.querySelector('.lb-img'), lbCap=lb.querySelector('.lb-cap'), lbCount=lb.querySelector('.lb-count');
    var gal=[], gi=0;
    function show(){var im=gal[gi]; lbImg.src=im.src; var fig=im.closest('figure'); var fc=fig?fig.querySelector('figcaption'):null;
      lbCap.textContent=fc?fc.textContent:(im.alt||''); lbCount.textContent=(gi+1)+' / '+gal.length; lb.classList.remove('zoom'); lb.scrollTo&&lb.scrollTo(0,0);}
    function open(img){var scope=img.closest('.case-main')||img.closest('section')||document;
      gal=[].slice.call(scope.querySelectorAll('.frame img')); gi=gal.indexOf(img); if(gi<0){gal=[img];gi=0;}
      show(); lb.classList.add('open'); document.body.style.overflow='hidden';}
    function close(){lb.classList.remove('open','zoom'); document.body.style.overflow=''; lbImg.src='';}
    function nav(d){gi=(gi+d+gal.length)%gal.length; show();}
    document.querySelectorAll('.frame img').forEach(function(img){img.closest('.frame').addEventListener('click',function(){open(img)})});
    lb.querySelector('.lb-close').onclick=close;
    lb.querySelector('.lb-prev').onclick=function(e){e.stopPropagation();nav(-1)};
    lb.querySelector('.lb-next').onclick=function(e){e.stopPropagation();nav(1)};
    lbImg.onclick=function(e){e.stopPropagation();lb.classList.toggle('zoom')};
    lb.onclick=function(e){if(e.target===lb)close()};
    addEventListener('keydown',function(e){if(!lb.classList.contains('open'))return;
      if(e.key==='Escape')close(); else if(e.key==='ArrowLeft')nav(-1); else if(e.key==='ArrowRight')nav(1);});

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
