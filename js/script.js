/* ==========================================================================
   TRAJANO CURTAIN'S PH — SITE SCRIPT
   Vanilla JS, no dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     1. Sticky nav background on scroll
  --------------------------------------------------------------------- */
  var nav = document.getElementById('site-nav');
  function onScrollNav() {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  /* ---------------------------------------------------------------------
     2. Mobile drawer (curtain-style slide menu)
  --------------------------------------------------------------------- */
  var menuToggle = document.getElementById('menu-toggle');
  var drawer = document.getElementById('mobile-drawer');
  var drawerOverlay = document.getElementById('drawer-overlay');
  var drawerClose = document.getElementById('drawer-close');

  function openDrawer() {
    drawer.classList.add('open');
    drawerOverlay.classList.add('open');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  menuToggle.addEventListener('click', openDrawer);
  drawerClose.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);
  document.querySelectorAll('.drawer-link').forEach(function (link) {
    link.addEventListener('click', closeDrawer);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
  });

  /* ---------------------------------------------------------------------
     3. Hero curtain reveal (signature element) — opens shortly after load
  --------------------------------------------------------------------- */
  var curtainStage = document.querySelector('.curtain-stage');
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (curtainStage) curtainStage.classList.add('open');
    }, reduceMotion ? 0 : 250);
  });

  /* ---------------------------------------------------------------------
     4. Scroll-reveal for sections (IntersectionObserver)
  --------------------------------------------------------------------- */
  var revealEls = document.querySelectorAll('.reveal-on-scroll');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* ---------------------------------------------------------------------
     5. Animated stat counters
  --------------------------------------------------------------------- */
  var counters = document.querySelectorAll('.stat-num');
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var duration = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    if (reduceMotion) { el.textContent = target; return; }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  } else {
    counters.forEach(animateCounter);
  }

  /* ---------------------------------------------------------------------
     6. Portfolio filtering
  --------------------------------------------------------------------- */
  var filterButtons = document.querySelectorAll('.filter-btn');
  var portfolioItems = document.querySelectorAll('.masonry-item');
  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var filter = btn.getAttribute('data-filter');
      portfolioItems.forEach(function (item) {
        var cats = item.getAttribute('data-cat');
        var show = filter === 'all' || cats.indexOf(filter) !== -1;
        item.classList.toggle('hide', !show);
      });
    });
  });

  /* ---------------------------------------------------------------------
     7. Lightbox gallery (keyboard + swipe + video support)
  --------------------------------------------------------------------- */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lightboxCaption = document.getElementById('lightbox-caption');
  var lightboxClose = document.getElementById('lightbox-close');
  var lightboxPrev = document.getElementById('lightbox-prev');
  var lightboxNext = document.getElementById('lightbox-next');

  // 1. SAFELY MAP DATA FOR BOTH IMAGES AND VIDEOS
  var galleryData = Array.prototype.map.call(portfolioItems, function (item) {
    var img = item.querySelector('img');
    var vid = item.querySelector('video');
    var cap = item.querySelector('figcaption');
    var captionText = cap ? cap.textContent.trim() : '';

    if (vid) {
      return {
        type: 'video',
        src: vid.src,
        alt: vid.getAttribute('aria-label') || captionText || 'Portfolio video',
        caption: captionText
      };
    } else if (img) {
      return {
        type: 'image',
        src: img.src,
        alt: img.alt || 'Portfolio image',
        caption: captionText
      };
    }
    return null;
  }).filter(Boolean); // Clears empty rows if any layout components conflict

  var currentIndex = 0;
  var lightboxVideo = null;

  function openLightbox(index) {
    currentIndex = index;
    updateLightboxImage();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Pause any playing lightbox video when closed
    if (lightboxVideo) {
      lightboxVideo.pause();
    }
  }

  function updateLightboxImage() {
    var data = galleryData[currentIndex];
    if (!data) return;

    // Remove old video container element if it exists from previous navigation
    if (lightboxVideo) {
      lightboxVideo.remove();
      lightboxVideo = null;
    }

    if (data.type === 'video') {
      // Hide standard image component
      lightboxImg.style.display = 'none';

      // Create a dynamic video component for the modal frame
      lightboxVideo = document.createElement('video');
      lightboxVideo.src = data.src;
      lightboxVideo.controls = true;
      lightboxVideo.autoplay = true;
      lightboxVideo.style.maxWidth = '100%';
      lightboxVideo.style.maxHeight = '75vh';
      lightboxVideo.style.display = 'block';
      lightboxVideo.style.margin = '0 auto';
      lightboxVideo.setAttribute('aria-label', data.alt);

      // Insert it directly before your image caption holder
      lightboxCaption.parentNode.insertBefore(lightboxVideo, lightboxCaption);
    } else {
      // Restore standard image layout values
      lightboxImg.style.display = 'block';
      lightboxImg.src = data.src;
      lightboxImg.alt = data.alt;
    }

    lightboxCaption.textContent = data.caption;
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % galleryData.length;
    updateLightboxImage();
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + galleryData.length) % galleryData.length;
    updateLightboxImage();
  }

  portfolioItems.forEach(function (item, i) {
    item.addEventListener('click', function () { openLightbox(i); });
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxNext.addEventListener('click', showNext);
  lightboxPrev.addEventListener('click', showPrev);

  lightbox.addEventListener('click', function (e) {
    // Don't close light box container if user clicks on controls inside the video element itself
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'ArrowLeft') showPrev();
  });

  // basic swipe support
  var touchStartX = 0;
  lightbox.addEventListener('touchstart', function (e) { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  lightbox.addEventListener('touchend', function (e) {
    var diff = e.changedTouches[0].screenX - touchStartX;
    if (diff > 50) showPrev();
    else if (diff < -50) showNext();
  }, { passive: true });
  /* ---------------------------------------------------------------------
      8. Before / After comparison slider (FIXED INITIAL INITIALIZATION)
   --------------------------------------------------------------------- */
  var baSlider = document.getElementById('ba-slider');
  var baAfterWrap = document.getElementById('ba-after-wrap');
  var baHandle = document.getElementById('ba-handle');
  var dragging = false;

  function setSlider(percentage) {
    percentage = Math.max(4, Math.min(96, percentage));
    baAfterWrap.style.width = percentage + '%';
    baHandle.style.left = percentage + '%';

    // Sinisiguro nitong laging lapat ang After image sa totoong sukat ng slider
    if (baSlider) {
      var sliderWidth = baSlider.getBoundingClientRect().width;
      var afterImg = baAfterWrap.querySelector('img');
      if (afterImg) {
        afterImg.style.width = sliderWidth + 'px';
      }
    }
  }

  function positionFromEvent(clientX) {
    var rect = baSlider.getBoundingClientRect();
    var x = clientX - rect.left;
    return (x / rect.width) * 100;
  }

  baHandle.addEventListener('mousedown', function () { dragging = true; });
  baHandle.addEventListener('touchstart', function () { dragging = true; }, { passive: true });
  window.addEventListener('mouseup', function () { dragging = false; });
  window.addEventListener('touchend', function () { dragging = false; });

  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    setSlider(positionFromEvent(e.clientX));
  });

  window.addEventListener('touchmove', function (e) {
    if (!dragging) return;
    setSlider(positionFromEvent(e.touches[0].clientX));
  }, { passive: true });

  baSlider.addEventListener('click', function (e) {
    setSlider(positionFromEvent(e.clientX));
  });

  // INITIALIZATION CODE: Dito tinutuwid ang sukat sa pagka-load pa lang
  function initSlider() {
    setSlider(55); // I-set sa 55% ang panimulang posisyon
  }

  // Patakbuhin kapag ready na ang window at CSS layouts
  window.addEventListener('load', initSlider);

  // Patakbuhin kapag nire-resize o iniikot ang screen ng mobile
  window.addEventListener('resize', function () {
    var currentPercent = parseFloat(baHandle.style.left) || 55;
    setSlider(currentPercent);
  });
  /* ---------------------------------------------------------------------
     9. FAQ accordion
  --------------------------------------------------------------------- */
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    var answer = btn.nextElementSibling;
    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.faq-q').forEach(function (other) {
        other.setAttribute('aria-expanded', 'false');
        other.nextElementSibling.style.maxHeight = null;
      });
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  /* ---------------------------------------------------------------------
     10. Quote form validation (client-side, no backend — demo submit)
  --------------------------------------------------------------------- */
  var form = document.getElementById('quote-form');
  var formSuccess = document.getElementById('form-success');
  // REMOVED: This handler was conflicting with the EmailJS handler below
  // The EmailJS handler (section 14) will handle all form submission

  /* ---------------------------------------------------------------------
     11. Back to top + footer year
  --------------------------------------------------------------------- */
  document.getElementById('back-to-top').addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------------
     12. Active menu highlighting (scroll spy)
  --------------------------------------------------------------------- */
  var sections = ['showroom', 'services', 'portfolio', 'why-us', 'process', 'quote', 'contact']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var navLinks = document.querySelectorAll('.nav-link');
  if ('IntersectionObserver' in window) {
    var spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          navLinks.forEach(function (link) {
            link.style.opacity = link.getAttribute('href') === '#' + id ? '1' : '';
          });
        }
      });
    }, { threshold: 0.4 });
    sections.forEach(function (s) { spyObserver.observe(s); });
  }

  /* ---------------------------------------------------------------------
     13. Smooth scroll for in-page anchors (fallback for older browsers)
  --------------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = link.getAttribute('href');
      if (targetId.length < 2) return;
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });
})();



/* ---------------------------------------------------------------------
     14. EMAILJS FORM SUBMISSION (via emailjs.com)
  --------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('quote-form');
    if (!form) return;

    const messengerBtn = document.getElementById('btn-send-messenger');
    const smsBtn = document.getElementById('btn-send-sms');
    const emailBtn = document.getElementById('btn-send-email');
    const fileInput = document.getElementById('q-photos');
    const fileListContainer = document.getElementById('file-list');

    // DITO IPAPASOK AT MAG-S-STACK ANG MGA LARAWAN BAGO I-SEND
    let imageStack = []; 
    
    var val = function (id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
    };

    // 1. MAKINIG TUWING MAY PIPILIING LARAWAN PARA I-STACK ISA-ISA
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files.length === 0) return;

            // Kuhanin ang piniling file at i-push sa stack list array natin
            const newFile = this.files[0];
            imageStack.push(newFile);

            // I-update ang visual listahan sa screen ng user
            renderFileList();

            // I-clear ang input value para pwede nilang i-click at piliin ulit ang susunod
            this.value = ''; 
        });
    }

    // FUNCTION PARA I-DISPLAY ANG MGA NAKA-STACK NA FILES NAY MAY REMOVE BUTTON
    function renderFileList() {
        if (!fileListContainer) return;
        fileListContainer.innerHTML = ''; // Limisin ang lumang listahan

        imageStack.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between bg-black/30 p-2 rounded border border-white/10 mt-1';
            item.style.color = "white";
            item.innerHTML = `
                <span>📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <button type="button" class="text-red-400 hover:text-red-600 font-bold ml-2 transition-colors" data-index="${index}">✕</button>
            `;
            fileListContainer.appendChild(item);
        });

        // Event listener para sa "✕" button para pwedeng magbawas kung nagkamali ng pili
        fileListContainer.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-index'));
                imageStack.splice(idx, 1); // Tanggalin sa array stack
                renderFileList(); // I-refresh ang itsura sa screen
            });
        });
    }

    // 2. FUNCTION PARA I-UPLOAD ANG LAHAT NG NAKALISTANG IMAGES SA IMGBB (LOOPING)
    async function uploadAllImages() {
        if (imageStack.length === 0) return 'No photos uploaded.';

        const imgbbApiKey = '0586ef4c2bb8c581873609e21b19ca5f'; // <--- PALITAN MO ITO NG KEY MO!
        let uploadedUrls = [];

        for (let i = 0; i < imageStack.length; i++) {
            const formData = new FormData();
            formData.append('image', imageStack[i]);

            try {
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (result.success) {
                    uploadedUrls.push(result.data.url); // Itabi ang link ng larawan
                }
            } catch (error) {
                console.error(`Failed to upload file ${imageStack[i].name}:`, error);
            }
        }

        // Pagsamahin ang mga links na nagawa na pinaghihiwalay ng bagong linya (new line)
        return uploadedUrls.length > 0 ? uploadedUrls.join('\n') : 'Upload failed.';
    }

    // 3. GENERATE THE COMPLETED PROFILE MESSAGE TEMPLATE
    function generateMessageText(linksText) {
        return `New Lead Details: Trajano Curtain's PH
-----------------------------------------
Client Information
Full Name: ${val('q-name') || 'N/A'}
Phone: ${val('q-phone') || 'N/A'}
Email: ${val('q-email') || 'N/A'}
Location: ${val('q-location') || 'N/A'}

Property & Project Profile
Property Type: ${val('q-property') || 'N/A'}
Project Type: ${val('q-project') || 'N/A'}
Target Treatment: ${val('q-treatment') || 'N/A'}
Budget Range: ${val('q-budget') || 'N/A'}

Window Specifications
Number of Windows: ${val('q-windows') || 'N/A'}
Approx. Dimensions: ${val('q-dimensions') || 'N/A'}
Ceiling Height: ${val('q-ceiling') || 'N/A'}

Booking Details
Preferred Date: ${val('q-schedule') || 'N/A'}

Notes: ${val('q-message') || 'None'}

Images links (uploaded):
${linksText}`;
    }

    // --- SMART MOBILE-FRIENDLY BUTTON ACTIONS ---

    // A. MESSENGER TRIGGER (Mobile & Desktop Optimized)
    if (messengerBtn) {
        messengerBtn.addEventListener('click', async function() {
            if (!form.checkValidity()) { form.reportValidity(); return; }
            
            const originalText = messengerBtn.textContent;
            messengerBtn.textContent = "⌛ Uploading Photos (Please wait)...";
            messengerBtn.disabled = true;

            const linksText = await uploadAllImages();
            const message = generateMessageText(linksText);

            messengerBtn.textContent = originalText;
            messengerBtn.disabled = false;

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            if (isMobile) {
                // Sa cellphone: Kokopyahin ang text para i-paste ng user, at bubuksan ang Messenger App
                navigator.clipboard.writeText(message).then(() => {
                    alert("Form details copied! Opening Messenger... Just PASTE and SEND in the chat.");
                    window.location.href = "https://m.me/CURTAINMAKER07";
                }).catch(() => {
                    // Back-up kung ayaw ng clipboard lock sa ibang phone browser
                    window.location.href = `https://m.me/CURTAINMAKER07?text=${encodeURIComponent(message)}`;
                });
            } else {
                // Sa Desktop/Laptop: Direct tab link gaya ng dati
                window.open(`https://m.me/CURTAINMAKER07?text=${encodeURIComponent(message)}`, '_blank');
            }
        });
    }

    // B. SMS TRIGGER (Standardization for Android & iOS Phones)
    if (smsBtn) {
        smsBtn.addEventListener('click', async function() {
            if (!form.checkValidity()) { form.reportValidity(); return; }
            
            const originalText = smsBtn.textContent;
            smsBtn.textContent = "⌛ Uploading Photos...";
            smsBtn.disabled = true;

            const linksText = await uploadAllImages();
            const message = generateMessageText(linksText);

            smsBtn.textContent = originalText;
            smsBtn.disabled = false;

            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            // Ang iOS (iPhone) ay gumagamit ng '&' habang ang Android at Desktop ay '?' o ';'
            const smsSeparator = isIOS ? '&' : '?';
            
            // PALITAN ANG IYONG NUMBER SA BABA
            window.location.href = `sms:+639123456789${smsSeparator}body=${encodeURIComponent(message)}`;
        });
    }

    // C. GMAIL / EMAIL TRIGGER (Auto-Detects Desktop Browser vs Mobile Email App)
    if (emailBtn) {
        emailBtn.addEventListener('click', async function() {
            if (!form.checkValidity()) { form.reportValidity(); return; }
            
            const originalText = emailBtn.textContent;
            emailBtn.textContent = "⌛ Uploading Photos...";
            emailBtn.disabled = true;

            const linksText = await uploadAllImages();
            const message = generateMessageText(linksText);
            
            const myEmail = "IYONG_EMAIL@gmail.com"; // <-- PALITAN MO NG EMAIL MO
            const subject = `[New Estimate Request] ${val('q-name') || 'Client'}`;
            
            emailBtn.textContent = originalText;
            emailBtn.disabled = false;
            
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                // Sa Phone: Awtomatikong bubuksan ang Gmail App o Default Mail App gamit ang mailto
                window.location.href = `mailto:${myEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
            } else {
                // Sa Laptop: Diretsong bubuksan ang Gmail Web Compose Tab gaya ng gusto mo
                window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${myEmail}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`, '_blank');
            }
        });
    }
});