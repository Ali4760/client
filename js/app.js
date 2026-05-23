/* ========================================
   Consumer Site - App JavaScript
   Navigation, Interactions, Animations
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
  initNavigation();
  initSlider();
  initNotifications();
  initRecordsScroll();
  initOrderTabs();
  initPartnerScroll();
});

/* ========== Bottom Navigation ========== */
function initNavigation() {
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  const currentPage = document.body.dataset.page;
  
  navItems.forEach(item => {
    if (item.dataset.page === currentPage) {
      item.classList.add('active');
    }
  });
}

/* ========== Promo Slider ========== */
function initSlider() {
  const wrapper = document.querySelector('.slides-wrapper');
  if (!wrapper) return;
  
  const slides = wrapper.querySelectorAll('.slide-item');
  if (slides.length === 0) return;
  
  let current = 0;
  let startX = 0;
  let isDragging = false;
  
  function goTo(index) {
    current = ((index % slides.length) + slides.length) % slides.length;
    wrapper.style.transform = `translateX(-${current * 100}%)`;
  }
  
  // Auto-rotate
  let autoTimer = setInterval(() => goTo(current + 1), 5000);
  
  // Touch support
  const container = wrapper.parentElement;
  if (container) {
    container.addEventListener('touchstart', (e) => {
      isDragging = true;
      startX = e.touches[0].clientX;
      clearInterval(autoTimer);
    });
    
    container.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 50) {
        goTo(diff > 0 ? current - 1 : current + 1);
      }
      autoTimer = setInterval(() => goTo(current + 1), 5000);
    });
  }
}

/* ========== Notification Rotation ========== */
function initNotifications() {
  const textEl = document.querySelector('.notification-text');
  if (!textEl) return;
  
  const items = textEl.querySelectorAll('.notification-item');
  if (items.length <= 1) return;
  
  let current = 0;
  items.forEach((item, i) => {
    item.style.display = i === 0 ? 'inline-block' : 'none';
  });
  
  setInterval(() => {
    items[current].style.display = 'none';
    current = (current + 1) % items.length;
    items[current].style.display = 'inline-block';
    items[current].style.animation = 'none';
    items[current].offsetHeight; // trigger reflow
    items[current].style.animation = 'slideNotification 0.5s ease';
  }, 3000);
}

/* ========== Records Auto-Scroll ========== */
function initRecordsScroll() {
  const list = document.querySelector('.records-list');
  if (!list) return;
  
  let scrollTimer = setInterval(() => {
    list.scrollTop += 1;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight) {
      list.scrollTop = 0;
    }
  }, 50);
  
  list.addEventListener('mouseenter', () => clearInterval(scrollTimer));
  list.addEventListener('mouseleave', () => {
    scrollTimer = setInterval(() => {
      list.scrollTop += 1;
      if (list.scrollTop + list.clientHeight >= list.scrollHeight) {
        list.scrollTop = 0;
      }
    }, 50);
  });
}

/* ========== Order Tab Switching ========== */
function initOrderTabs() {
  const tabs = document.querySelectorAll('.order-btn > div');
  const sections = document.querySelectorAll('.order-section');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const target = tab.dataset.tab;
      sections.forEach(s => {
        s.style.display = s.dataset.section === target ? 'block' : 'none';
      });
    });
  });
}

/* ========== Partner Scroll ========== */
function initPartnerScroll() {
  const container = document.querySelector('.partners-container');
  if (!container) return;
  
  const leftBtn = document.querySelector('.arrow-left');
  const rightBtn = document.querySelector('.arrow-right');
  
  if (leftBtn) {
    leftBtn.addEventListener('click', () => {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    });
  }
  
  if (rightBtn) {
    rightBtn.addEventListener('click', () => {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    });
  }
}

/* ========== Dialog Management ========== */
function openDialog(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add('active');
}

function closeDialog(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('active');
}

// Close dialog on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('dialog-overlay')) {
    e.target.classList.remove('active');
  }
});
