// Global UI behaviors for MILLERS
(function(){
  'use strict';

  // NAV: morph into compact pill and update progress
  const nav = document.querySelector('.nav-island');
  const progress = document.querySelector('.nav-progress');
  function updateNav() {
    if (!nav) return;
    const scrollY = window.scrollY || window.pageYOffset;
    if (scrollY > 50) nav.classList.add('compact'); else nav.classList.remove('compact');
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    if (progress) progress.style.width = scrollPercent + '%';
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav);
  document.addEventListener('DOMContentLoaded', updateNav);

  // Scroll reveal observer for .fade-in elements
  const revealObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if (entry.isIntersecting) {
        const delay = parseFloat(entry.target.dataset.delay || 0);
        setTimeout(()=>{ entry.target.classList.add('revealed'); }, delay*1000);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.fade-in').forEach(el => revealObserver.observe(el));

  // Button ripple
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.btn-magnetic');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
    btn.appendChild(ripple);
    setTimeout(()=> ripple.remove(), 700);
  });

  // Keyboard activation for focusable progress bars (seek by Enter/Space)
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Enter' && e.code !== 'Space') return;
    const el = document.activeElement;
    if (!el) return;
    if (el.classList && el.classList.contains('progress-bar')) {
      e.preventDefault();
      el.click();
    }
  });

  // Conditional Three.js particles (minimal) - only load on devices that can handle it
  const isMobile = window.matchMedia('(pointer: coarse)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!isMobile && !prefersReducedMotion && document.getElementById('particle-canvas')){
    import('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js')
    .then(THREE => {
      try {
        const canvas = document.getElementById('particle-canvas');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const particleCount = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        for (let i=0;i<particleCount;i++){
          const theta = Math.random()*Math.PI*2;
          const phi = Math.acos((Math.random()*2)-1);
          const radius = 3 + Math.random()*4;
          positions[i*3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[i*3+1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[i*3+2] = radius * Math.cos(phi);
          const isGreen = Math.random() > 0.6;
          colors[i*3] = isGreen ? 0.13 : 0.8;
          colors[i*3+1] = isGreen ? 0.77 : 0.85;
          colors[i*3+2] = isGreen ? 0.37 : 0.95;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const material = new THREE.PointsMaterial({ size: 0.02, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true });
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        camera.position.z = 6;
        let mouseX=0, mouseY=0;
        document.addEventListener('mousemove', (e)=>{
          mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
          mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
        }, { passive: true });
        function animate(){
          requestAnimationFrame(animate);
          particles.rotation.y += 0.0005;
          particles.rotation.x += 0.0002;
          camera.position.x += (mouseX - camera.position.x) * 0.02;
          camera.position.y += (-mouseY - camera.position.y) * 0.02;
          camera.lookAt(scene.position);
          renderer.render(scene, camera);
        }
        animate();
        window.addEventListener('resize', ()=>{
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        });
      } catch (err){
        console.warn('Three.js init failed', err);
      }
    }).catch(err=>{ console.warn('Could not load three.js', err); });
  }

  /* 3D tilt + holographic sheen for beat cards (lightweight, throttled) */
  (function(){
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isCoarse || reduceMotion) return;

    let raf = null;
    let activeCard = null;
    let mouseX = 0, mouseY = 0;

    function updateTilt(){
      if (!activeCard) return;
      const rect = activeCard.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      const dx = (mouseX - cx) / rect.width;
      const dy = (mouseY - cy) / rect.height;
      const rotateY = dx * 8; // degrees
      const rotateX = -dy * 8;
      const translateZ = 10 + Math.min(20, Math.hypot(dx,dy)*60);
      activeCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${translateZ}px)`;
      activeCard.style.boxShadow = `0 30px 60px rgba(0,0,0,0.45), 0 0 40px rgba(34,197,94,0.04)`;
      raf = null;
    }

    document.addEventListener('mousemove', (e)=>{
      mouseX = e.clientX; mouseY = e.clientY;
      if (!raf && activeCard) raf = requestAnimationFrame(updateTilt);
    }, { passive: true });

    document.addEventListener('pointerenter', (e)=>{
      const card = e.target.closest('.beat-card');
      if (!card) return;
      activeCard = card;
      card.classList.add('is-tilting');
      if (!raf) raf = requestAnimationFrame(updateTilt);
    }, true);

    document.addEventListener('pointerleave', (e)=>{
      const card = e.target.closest('.beat-card');
      if (!card) return;
      if (activeCard === card) {
        activeCard.style.transform = '';
        activeCard.style.boxShadow = '';
        activeCard.classList.remove('is-tilting');
        activeCard = null;
      }
    }, true);

    // Keyboard accessibility: play on Enter/Space when focusing a beat-card
    document.addEventListener('keydown', (e)=>{
      if (e.code === 'Enter' || e.code === 'Space'){
        const el = document.activeElement;
        if (el && el.classList.contains('beat-card')){
          const beat = el.getAttribute('data-beat');
          const playBtn = el.querySelector('.play-btn');
          if (playBtn) playBtn.click();
        }
      }
    });
  })();

  /* Waveform hero simulation — simple sine-based visualizer driven by beat BPM */
  (function(){
    const canvas = document.getElementById('waveform-hero');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width=0, height=0, dpi=1;
    let lastPlaying = null;
    let amplitude = 0.02; // normalized
    let targetAmp = 0.02;
    let bpm = 100;

    function resize(){
      dpi = window.devicePixelRatio || 1;
      width = canvas.clientWidth * dpi;
      height = canvas.clientHeight * dpi;
      canvas.width = width;
      canvas.height = height;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw(t){
      ctx.clearRect(0,0,width,height);
      // gentle background
      ctx.fillStyle = 'rgba(10,12,18,0.3)';
      ctx.fillRect(0,0,width,height);

      // base frequency derived from bpm
      const time = t/1000;
      const freq = (bpm/60) * 0.5; // cycles per second
      amplitude += (targetAmp - amplitude) * 0.06;

      // draw multiple layered sine waves
      for (let layer=0; layer<3; layer++){
        const offset = layer * 0.5;
        const a = amplitude * (1 - layer*0.3);
        ctx.beginPath();
        for (let x=0;x<width;x++){
          const nx = x/width;
          const y = Math.sin((nx*freq*Math.PI*2) + (time*(1+layer*0.2)) + offset) * (height*0.25) * a + height*0.5;
          if (x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.strokeStyle = layer===0 ? 'rgba(34,197,94,0.9)' : layer===1 ? 'rgba(139,92,246,0.6)' : 'rgba(226,232,240,0.2)';
        ctx.lineWidth = 2 * (1 - layer*0.35) * dpi;
        ctx.stroke();
      }

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);

    // Watch for global playback changes (beatstore sets window.currentlyPlaying)
    setInterval(()=>{
      const playing = window.currentlyPlaying || null;
      if (playing !== lastPlaying){
        lastPlaying = playing;
        if (playing){
          const card = document.querySelector(`[data-beat="${playing}"]`);
          const b = card?.dataset?.bpm ? parseInt(card.dataset.bpm,10) : 100;
          bpm = b;
          targetAmp = 0.14; // boost when playing
        } else {
          targetAmp = 0.02; // idle
        }
      }
    }, 160);
  })();
})();
