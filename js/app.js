/* ========================================
   Consumer Site - App JavaScript
   Navigation, Interactions, Animations
   Firebase-Powered Backend
   ======================================== */

import { db, auth, phoneToEmail, collection, getDocs, addDoc, updateDoc, doc, onSnapshot, setDoc, query, where, getDoc, serverTimestamp, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from './firebase-config.js';

// Global user data cache — loaded from Firestore after auth
window.currentUserData = null;
window.firestoreReady = false;

// Global HTML escaping helper to prevent XSS warnings
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Instantly boot theme preference to avoid flash of other theme
(function() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark-theme');
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.add('dark-theme');
    });
  } else {
    document.documentElement.classList.remove('dark-theme');
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.remove('dark-theme');
    });
  }
})();

// Premium graphical popup modal alert override
(function() {
  window.alert = function(message) {
    const msgLower = String(message).toLowerCase();
    const isSuccess = msgLower.includes('success') || msgLower.includes('copied') || msgLower.includes('passed') || msgLower.includes('updated');
    const type = isSuccess ? 'success' : 'error';
    
    const existing = document.getElementById('custom-popup-alert');
    if (existing) existing.remove();

    // Premium Liquid Glass Theme Properties
    const overlayBg = 'rgba(10, 14, 26, 0.65)';
    const cardBg = 'rgba(255, 255, 255, 0.04)';
    const cardBorder = '1px solid rgba(255, 255, 255, 0.08)';
    const cardBlur = '30px';
    const cardShadow = '0 24px 60px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
    const textColor = '#ffffff';
    const colorVar = type === 'success' ? '#33f0c8' : '#ff5252';
    
    const buttonBg = 'linear-gradient(135deg, #71c2d1 0%, #326d80 100%)';
    const buttonShadow = '0 8px 24px rgba(113, 194, 209, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)';

    const modal = document.createElement('div');
    modal.id = 'custom-popup-alert';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: ${overlayBg};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
      opacity: 0;
      transition: opacity 0.25s ease-out;
    `;

    modal.innerHTML = `
      <div style="
        background: ${cardBg};
        border: ${cardBorder};
        border-radius: 24px;
        padding: 32px 24px;
        width: 88%;
        max-width: 360px;
        text-align: center;
        box-shadow: ${cardShadow};
        backdrop-filter: blur(${cardBlur});
        -webkit-backdrop-filter: blur(${cardBlur});
        transform: scale(0.9);
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
        overflow: hidden;
      " id="custom-popup-content">
        <div style="
          width: 56px;
          height: 56px;
          border-radius: 28px;
          background: oklch(from ${colorVar} l c h / 15%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px auto;
          border: 1.5px solid oklch(from ${colorVar} l c h / 35%);
          color: ${colorVar};
        ">
          ${type === 'success' 
            ? `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
          }
        </div>
        <div style="
          font-size: 15px;
          font-weight: 600;
          color: ${textColor};
          margin-bottom: 24px;
          line-height: 1.5;
          font-family: var(--font-family);
        ">
          ${message}
        </div>
        <button style="
          background: ${buttonBg};
          box-shadow: ${buttonShadow};
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 13px 24px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);
          font-family: var(--font-family);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        " onclick="closeCustomAlert()" onmouseover="this.style.transform='translateY(-2px) scale(1.02)'" onmouseout="this.style.transform='translateY(0) scale(1)'">
          OK
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    window.closeCustomAlert = function() {
      modal.style.opacity = '0';
      const content = document.getElementById('custom-popup-content');
      if (content) content.style.transform = 'scale(0.9)';
      setTimeout(() => {
        modal.remove();
      }, 250);
    };

    modal.addEventListener('click', (e) => {
      if (e.target === modal) window.closeCustomAlert();
    });

    modal.offsetHeight;
    modal.style.opacity = '1';
    const content = document.getElementById('custom-popup-content');
    if (content) content.style.transform = 'scale(1)';
  };
})();

// Bulletproof safety getter for assigned tasks — Firestore-backed with localStorage fallback
function safeGetAssignedTasks() {
  try {
    // Synchronous path: use cached tasks if available
    if (window.currentUserData && window.currentUserData._cachedTasks) {
      return window.currentUserData._cachedTasks;
    }
    // Fallback to localStorage for backward compat during transition
    const userId = localStorage.getItem('userId') || '987654321';
    const raw = localStorage.getItem('tasks_' + userId);
    if (!raw || raw === 'null' || raw === 'undefined') return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// Async Firestore getter for assigned tasks — call this for fresh data
async function fetchAssignedTasksFromFirestore(userId) {
  try {
    const q = query(collection(db, 'tasks'), where('userId', '==', String(userId)));
    const snapshot = await getDocs(q);
    const tasks = [];
    snapshot.forEach(docSnap => {
      tasks.push({ _docId: docSnap.id, ...docSnap.data() });
    });
    // Sort by seq ascending
    tasks.sort((a, b) => (a.seq || 0) - (b.seq || 0));
    // Cache locally
    if (window.currentUserData) {
      window.currentUserData._cachedTasks = tasks;
    }
    // Also sync to localStorage for synchronous reads elsewhere
    localStorage.setItem('tasks_' + userId, JSON.stringify(tasks));
    return tasks;
  } catch (e) {
    console.error('Failed to fetch tasks from Firestore:', e);
    return safeGetAssignedTasks();
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  // Initialize non-data-dependent UI first
  initNavigation();
  initSlider();
  initNotifications();
  initRecordsScroll();
  initOrderTabs();
  initPartnerScroll();
  initPageAnimations();
  initRippleEffects();
  initFilterTags();
  initThemeToggle();

  const currentPage = document.body.dataset.page;

  // For login and register pages, skip Firestore data load
  if (currentPage === 'login' || currentPage === 'register') {
    if (currentPage === 'register' && window.generateNewCaptcha) window.generateNewCaptcha();
    return;
  }

  // Security Gate: Redirect unauthenticated sessions instantly to login.html
  const firestoreUid = localStorage.getItem('firestoreUid');
  if (!firestoreUid) {
    window.location.href = 'login.html';
    return;
  }

  // Load user data from Firestore, then render
  await loadCurrentUserFromFirestore();
  renderUserData();

  // Dynamic records list rendering
  if (currentPage === 'recharge-record') {
    renderRechargeRecords();
  } else if (currentPage === 'withdraw-record') {
    renderWithdrawRecords();
  } else if (currentPage === 'orders') {
    renderDynamicOrdersPage();
  } else if (currentPage === 'team') {
    if (window.renderTeamPage) window.renderTeamPage();
  } else if (currentPage === 'recharge') {
    initCustomerRechargePage();
  }

  // Failsafe for Sign Out buttons missing explicit onclick handlers
  document.querySelectorAll('button, a, div').forEach(el => {
    if (el.textContent && (el.textContent.trim().toLowerCase() === 'sign out' || el.textContent.trim().toLowerCase() === 'logout')) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        window.handleSignOut();
      });
    }
  });
});

// Load current user profile from Firestore into window.currentUserData and sync to localStorage
async function loadCurrentUserFromFirestore() {
  const firestoreUid = localStorage.getItem('firestoreUid');
  if (!firestoreUid) return; // Not logged in via Firebase yet

  try {
    const userDocRef = doc(db, 'users', firestoreUid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      window.currentUserData = { _docId: firestoreUid, ...data };
      window.firestoreReady = true;

      // Sync critical fields to localStorage for synchronous reads throughout the app
      localStorage.setItem('nickname', data.nickname || 'User');
      localStorage.setItem('userId', data.userId || '');
      localStorage.setItem('invitationCode', data.invitationCode || '');
      localStorage.setItem('balance', String(data.balance || 0));
      localStorage.setItem('phone', data.phone || '');
      localStorage.setItem('trc20_address', data.trc20_address || '');
      localStorage.setItem('withdraw_password', data.withdraw_password || '');
      localStorage.setItem('balance_' + data.userId, String(data.balance || 0));
      localStorage.setItem('totalTasks_' + data.userId, String(data.totalTasks || 60));
      localStorage.setItem('orderGrab_' + data.userId, data.orderGrab ? '1' : '0');
      localStorage.setItem('completedTasks', String(data.completedTasks || 0));
      localStorage.setItem('completedTasks_' + data.userId, String(data.completedTasks || 0));

      // Fetch and cache tasks
      await fetchAssignedTasksFromFirestore(data.userId);
    } else {
      // User document not found in Firestore — sign out and redirect to login
      console.warn("User document not found in Firestore. Logging out...");
      const savedTheme = localStorage.getItem('theme');
      localStorage.clear();
      if (savedTheme) localStorage.setItem('theme', savedTheme);
      window.location.href = 'login.html';
    }
  } catch (e) {
    console.error('Failed to load user from Firestore:', e);
    // Aggressive fallback to prevent ghost sessions
    const savedTheme = localStorage.getItem('theme');
    localStorage.clear();
    if (savedTheme) localStorage.setItem('theme', savedTheme);
    window.location.href = 'login.html';
  }
}

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

/* ========== Records Auto-Scroll (Hall of Fame Dynamic Engine) ========== */
const ACTIVITY_FEED = [
  "60****8901 Recharge 80 USDT",
  "79****1234 Recharge 200 USDT",
  "90****6789 Successful withdrawal 100 USDT",
  "456****7890 Successful withdrawal 80 USDT",
  "162****8901 Recharge 180 USDT",
  "33****4521 Recharge 50 USDT",
  "87****9023 Successful withdrawal 120 USDT",
  "23****7812 Recharge 3000 USDT",
  "567****2341 Recharge 2500 USDT",
  "11****6734 Successful withdrawal 60 USDT",
  "78****3490 Recharge 150 USDT",
  "345****8912 Successful withdrawal 200 USDT",
  "56****1289 Recharge 900 USDT",
  "92****4567 Successful withdrawal 180 USDT",
  "234****6701 Recharge 700 USDT",
  "14****8923 Recharge 500 USDT",
  "67****2134 Successful withdrawal 400 USDT",
  "890****3456 Recharge 120 USDT",
  "38****7890 Successful withdrawal 3000 USDT",
  "123****5678 Recharge 80 USDT",
  "71****9012 Recharge 220 USDT",
  "45****3467 Successful withdrawal 100 USDT",
  "901****2345 Recharge 60 USDT",
  "16****8034 Successful withdrawal 280 USDT",
  "84****5612 Recharge 100 USDT",
  "678****9123 Successful withdrawal 500 USDT",
  "29****7845 Recharge 4000 USDT",
  "53****1290 Successful withdrawal 1200 USDT",
  "789****4561 Recharge 160 USDT",
  "42****6789 Successful withdrawal 900 USDT",
  "17****3456 Recharge 3500 USDT",
  "96****8012 Successful withdrawal 700 USDT",
  "312****7890 Recharge 200 USDT",
  "65****4123 Successful withdrawal 1800 USDT",
  "81****9034 Recharge 1100 USDT",
  "234****5670 Successful withdrawal 600 USDT",
  "50****2789 Recharge 2500 USDT",
  "73****6401 Successful withdrawal 3200 USDT",
  "19****8923 Recharge 800 USDT",
  "456****1234 Successful withdrawal 1400 USDT",
  "62****5078 Recharge 170 USDT",
  "88****3412 Successful withdrawal 2600 USDT",
  "27****9056 Recharge 500 USDT",
  "134****6789 Successful withdrawal 1000 USDT",
  "75****2301 Recharge 450 USDT",
  "91****7845 Successful withdrawal 800 USDT",
  "367****0123 Recharge 1300 USDT",
  "44****5689 Successful withdrawal 2200 USDT",
  "83****1234 Recharge 600 USDT",
  "20****7890 Successful withdrawal 1600 USDT",
  "57****4512 Recharge 2800 USDT",
  "169****3456 Successful withdrawal 900 USDT",
  "76****8901 Recharge 1500 USDT",
  "32****6078 Successful withdrawal 3500 USDT",
  "89****2345 Recharge 700 USDT",
  "412****7891 Successful withdrawal 1100 USDT",
  "61****9034 Recharge 2000 USDT",
  "47****5612 Successful withdrawal 1700 USDT",
  "18****3490 Recharge 1200 USDT",
  "93****7823 Successful withdrawal 4000 USDT"
];

function initRecordsScroll() {
  const list = document.querySelector('.records-list');
  if (!list) return;
  
  function parseActivity(str) {
    let phone = '';
    let status = '';
    let amount = '';
    
    if (str.includes(" Recharge ")) {
      const parts = str.split(" Recharge ");
      phone = parts[0];
      status = "Recharge";
      amount = parts[1];
    } else if (str.includes(" Successful withdrawal ")) {
      const parts = str.split(" Successful withdrawal ");
      phone = parts[0];
      status = "Successful withdrawal";
      amount = parts[1];
    }
    return { phone, status, amount };
  }
  
  function createTransactionHtml(tx) {
    return `<div class="record-item"><span class="record-phone">${escapeHtml(tx.phone)}</span><span class="record-status">${escapeHtml(tx.status)}</span><span class="record-amount">${escapeHtml(tx.amount)}</span></div>`;
  }
  
  // Pre-populate with 15 dynamic items to fill viewport height
  list.innerHTML = '';
  for (let i = 0; i < 15; i++) {
    const feedItem = ACTIVITY_FEED.at(i % ACTIVITY_FEED.length);
    list.insertAdjacentHTML('beforeend', createTransactionHtml(parseActivity(feedItem)));
  }
  
  let feedIndex = 15;
  let scrollTimer;
  
  function startScroll() {
    scrollTimer = setInterval(() => {
      list.scrollTop += 1;
      
      // Once the first item has scrolled completely out of view (around 40px height)
      if (list.scrollTop >= 40) {
        const firstItem = list.firstElementChild;
        if (firstItem) {
          // Append first item to the bottom of the scroll view
          list.appendChild(firstItem);
          
          // Instantly refresh its contents with next item from ACTIVITY_FEED
          const feedItem = ACTIVITY_FEED.at(feedIndex % ACTIVITY_FEED.length);
          const newTx = parseActivity(feedItem);
          feedIndex++;
          
          firstItem.querySelector('.record-phone').textContent = newTx.phone;
          firstItem.querySelector('.record-status').textContent = newTx.status;
          firstItem.querySelector('.record-amount').textContent = newTx.amount;
        }
        // Adjust scrollTop by 40px to prevention jumpiness
        list.scrollTop = 0;
      }
    }, 45);
  }
  
  startScroll();
  
  list.addEventListener('mouseenter', () => clearInterval(scrollTimer));
  list.addEventListener('mouseleave', startScroll);
}

/* ========== Order Tab Switching ========== */
window.switchTab = function(tabName) {
  // Hide all tab panels instantly — no fade, no slide
  document.querySelectorAll('.tab-panel, .tab-content, .order-section, [class*="tab-"]').forEach(el => {
    el.style.display = 'none';
  });

  // Show target panel instantly
  const target = document.getElementById(tabName) ||
                 document.querySelector(`[data-section="${tabName}"]`) ||
                 document.querySelector(`.tab-panel[id="${tabName}"], .tab-content[id="${tabName}"], .order-section[data-section="${tabName}"]`) ||
                 document.querySelector(`[data-tab="${tabName}"]`);
  if (target) target.style.display = 'block';

  // Update active tab indicator
  document.querySelectorAll('.tab-item, .tab-btn, .order-btn > div, .nav-item').forEach(el => {
    el.classList.remove('active');
  });
  const activeBtn = document.querySelector(`[data-tab="${tabName}"], [href="#${tabName}"]`);
  if (activeBtn) activeBtn.classList.add('active');
};

function initOrderTabs() {
  const tabs = document.querySelectorAll('.order-btn > div');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      window.switchTab(target);
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

/* ========== Page Load Animations ========== */
function initPageAnimations() {
  // Staggered entrance for cards and sections
  const animateTargets = document.querySelectorAll(
    '.order-card, .record-card, .content-card, .menu-group, .member-row, .userinfo-item'
  );
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          entry.target.style.animationDelay = `${index * 0.05}s`;
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
    
    animateTargets.forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
  } else {
    // Fallback for browsers without IntersectionObserver
    animateTargets.forEach(el => {
      el.classList.add('animate-in');
    });
  }
}

/* ========== Ripple Effect on Buttons ========== */
function initRippleEffects() {
  const buttons = document.querySelectorAll(
    '.auth-btn, .btn-primary, .start-matching-btn, .receive-btn, .copy-btn, .server-btn, .btn-confirm'
  );
  
  buttons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        transform: scale(0);
        animation: rippleEffect 0.6s ease-out;
        pointer-events: none;
      `;
      
      this.style.position = this.style.position || 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

/* ========== Financial Filter Tags ========== */
function initFilterTags() {
  const tags = document.querySelectorAll('.filter-tag');
  if (tags.length === 0) return;
  
  tags.forEach(tag => {
    tag.addEventListener('click', () => {
      tags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
    });
  });
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

/* ========== Password Strength Checker ========== */
function checkPasswordStrength(input) {
  const val = input.value;
  const bars = input.closest('.form-group').querySelectorAll('.strength-bar');
  const text = input.closest('.form-group').querySelector('.strength-text');
  if (!bars.length) return;
  
  let strength = 0;
  if (val.length >= 6) strength++;
  if (val.length >= 10) strength++;
  if (/[A-Z]/.test(val) && /[0-9]/.test(val)) strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;
  
  const levels = ['', 'weak', 'medium', 'strong', 'strong'];
  const labels = ['', 'Weak', 'Medium', 'Strong', 'Very Strong'];
  
  bars.forEach((bar, i) => {
    bar.className = 'strength-bar';
    if (i < strength) {
      bar.classList.add('active', levels[strength]);
    }
  });
  
  if (text) {
    text.textContent = val.length > 0 ? labels[strength] : '';
    text.className = 'strength-text ' + (val.length > 0 ? levels[strength] : '');
  }
}

/* ========== Light/Dark Theme Switcher ========== */
function initThemeToggle() {
  const switchCheckbox = document.getElementById('themeSwitchCheckbox');
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!switchCheckbox) return;

  // Set initial checkbox state based on body class
  const isDark = document.body.classList.contains('dark-theme');
  switchCheckbox.checked = isDark;

  // Toggle function
  function toggleTheme() {
    const shouldBeDark = switchCheckbox.checked;
    if (shouldBeDark) {
      document.body.classList.add('dark-theme');
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  // Bind listener to switch
  switchCheckbox.addEventListener('change', toggleTheme);

  // Allow clicking anywhere on the menu item container to toggle
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      // Don't double-toggle if clicking directly on label/input
      if (e.target.closest('.theme-switch-wrapper') || e.target.closest('input')) return;
      switchCheckbox.checked = !switchCheckbox.checked;
      toggleTheme();
    });
  }
}

/* ========== User Data Rendering System ========== */
function renderUserData() {
  const nickname = localStorage.getItem('nickname') || 'User';
  const userId = localStorage.getItem('userId') || '';
  const invitationCode = localStorage.getItem('invitationCode') || '';
  const trc20Address = localStorage.getItem('trc20_address') || '';
  const phone = localStorage.getItem('phone') || '';
  const balanceVal = parseFloat(localStorage.getItem('balance') || '0.00');
  const balanceStr = balanceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Render Nickname
  const userNameEl = document.querySelector('.user-name');
  if (userNameEl) userNameEl.textContent = nickname;

  // Render User ID / Invite Code in profile header
  const userIdEl = document.querySelector('.user-id');
  if (userIdEl) {
    userIdEl.textContent = `ID: ${userId} | Invitation code: ${invitationCode}`;
  }

  // Render Balance in profile page
  const balanceValEl = document.querySelector('.balance-value');
  if (balanceValEl) {
    balanceValEl.textContent = '';
    const textNode = document.createTextNode(balanceStr);
    const spanNode = document.createElement('span');
    spanNode.className = 'balance-unit';
    spanNode.textContent = 'USDT';
    balanceValEl.appendChild(textNode);
    balanceValEl.appendChild(spanNode);
  }

  // Render Dynamic Stats on Trade Page
  const tasks = safeGetAssignedTasks();
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const completedCount = completedTasks.length;
  
  // Section 6 - Get Total Tasks Control
  function getTotalTasks(uid) {
    return parseInt(localStorage.getItem('totalTasks_' + uid)) || 60;
  }
  const totalCount = getTotalTasks(userId);

  const tradeBalanceEl = document.getElementById('tradeBalanceVal') || document.querySelector('body[data-page="trade"] .info-item:first-child .value');
  if (tradeBalanceEl) {
    tradeBalanceEl.textContent = `${balanceStr} USDT`;
  }

  const tradeCompletedNumEl = document.getElementById('tradeCompletedNum');
  if (tradeCompletedNumEl) {
    tradeCompletedNumEl.textContent = completedCount;
  }

  const tradeTotalTaskEl = document.getElementById('tradeTotalTask');
  if (tradeTotalTaskEl) {
    tradeTotalTaskEl.textContent = totalCount;
  }

  const tradeExpectedReturnValEl = document.getElementById('tradeExpectedReturnVal');
  if (tradeExpectedReturnValEl) {
    const nextTask = tasks.find(t => t.status === 'Waiting');
    tradeExpectedReturnValEl.textContent = nextTask ? `${nextTask.commission.toFixed(2)}%` : '0.60%';
  }

  const totalBenefits = completedTasks.reduce((sum, t) => sum + (t.actualCommission || 0), 0);

  // Dynamic Cumulative Income on Index (Home) Page
  const homeCumulativeIncomeEl = document.getElementById('homeCumulativeIncome') || document.querySelector('.top-header .income-amount .amount');
  if (homeCumulativeIncomeEl) {
    homeCumulativeIncomeEl.textContent = totalBenefits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const tradeBenefitsValEl = document.getElementById('tradeBenefitsVal');
  if (tradeBenefitsValEl) {
    tradeBenefitsValEl.textContent = `${totalBenefits.toFixed(2)} USDT`;
    localStorage.setItem('todays_benefits', totalBenefits.toFixed(2));
  }

  // Render Balance on Team Page
  const teamBalanceEl = document.querySelector('body[data-page="team"] .balance-section .value');
  if (teamBalanceEl) {
    teamBalanceEl.textContent = `$${balanceStr}`;
  }

  // Render Invitation Code on Invite Page
  const inviteCodeTextEl = document.querySelector('body[data-page="invite"] .invite-code-text');
  if (inviteCodeTextEl) {
    inviteCodeTextEl.textContent = invitationCode;
  }

  // Render Referral Link on Invite Page
  const inviteLinkTextEl = document.querySelectorAll('body[data-page="invite"] .invite-code-text')[1];
  if (inviteLinkTextEl) {
    inviteLinkTextEl.textContent = `https://qivonxa.shop/#/register?code=${invitationCode}`;
  }

  // Render Nickname on Userinfo Page
  const userInfoNicknameEl = document.getElementById('userInfoNickname');
  if (userInfoNicknameEl) userInfoNicknameEl.textContent = nickname;

  // Render Phone on Userinfo Page (with mask: 123****4567)
  const userInfoPhoneEl = document.getElementById('userInfoPhone');
  if (userInfoPhoneEl) {
    if (phone.length >= 7) {
      userInfoPhoneEl.textContent = phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
    } else {
      userInfoPhoneEl.textContent = phone;
    }
  }

  // Render TRC-20 Address on Userinfo Page
  const userInfoAddressEl = document.getElementById('userInfoAddress');
  if (userInfoAddressEl) {
    if (trc20Address.length > 12) {
      userInfoAddressEl.textContent = trc20Address.substring(0, 4) + '...' + trc20Address.substring(trc20Address.length - 5);
    } else {
      userInfoAddressEl.textContent = trc20Address;
    }
  }

  // Render Available Balance on Withdraw Page
  const availableBalanceEl = document.getElementById('availableBalance');
  if (availableBalanceEl) {
    availableBalanceEl.textContent = `${balanceStr} USDT`;
  }

  // Render Withdrawal Address Input on Withdraw Page
  const withdrawAddressInputEl = document.getElementById('withdrawAddressInput');
  if (withdrawAddressInputEl) {
    withdrawAddressInputEl.value = trc20Address;
  }
}

/* ========== Registration Handling (Firebase Auth + Firestore) ========== */
window.handleRegistration = async function() {
  const nicknameInput = document.getElementById('registerNickname');
  const emailInput = document.getElementById('registerEmail');
  const countrySelect = document.getElementById('registerCountryCode');
  const phoneInput = document.getElementById('registerPhone');
  const passwordInput = document.getElementById('registerPassword');
  const captchaInput = document.getElementById('registerCaptchaAnswer');
  const inviteInput = document.getElementById('registerInviteCode');

  if (!nicknameInput || !emailInput || !phoneInput || !passwordInput || !captchaInput) {
    alert('Registering...');
    window.location.href = 'login.html';
    return;
  }

  const nickname = nicknameInput.value.trim();
  const email = emailInput.value.trim();
  const countryCode = countrySelect ? countrySelect.value : '+20';
  const phoneNum = phoneInput.value.trim();
  const password = passwordInput.value;
  const captchaAns = captchaInput.value.trim();
  const inviteCode = inviteInput ? inviteInput.value.trim() : '';

  if (!nickname || !email || !phoneNum || !password || !captchaAns) {
    alert('Please fill in all required fields.');
    return;
  }

  // Validate Email structure
  if (!email.includes('@') || !email.includes('.')) {
    alert('Please enter a valid email address.');
    return;
  }

  // Validate Math Captcha
  const userAns = parseInt(captchaAns);
  if (isNaN(userAns) || userAns !== window.captchaAnswer) {
    alert('Invalid captcha');
    if (window.generateNewCaptcha) window.generateNewCaptcha();
    return;
  }

  // Format full phone number (e.g. +20 123456789)
  const phone = countryCode + ' ' + phoneNum;

  // Generate random 6-character invitation code for their own referrals
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randCode = '';
  for (let i = 0; i < 6; i++) {
    randCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Generate random 9-digit user ID
  const randId = String(Math.floor(100000000 + Math.random() * 900000000));

  // Disable button and show loading state
  const btn = document.querySelector('.auth-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Creating account...';
  }

  try {
    // 1. Create Firebase Auth account with real email
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUid = userCredential.user.uid;

    // 2. Create user profile document in Firestore
    await setDoc(doc(db, 'users', firebaseUid), {
      nickname: nickname,
      email: email,
      phone: phone,
      userId: randId,
      invitationCode: randCode,
      invitedBy: inviteCode,
      balance: 0.00,
      trc20_address: '',
      withdraw_password: '',
      orderGrab: false,
      completedTasks: 0,
      totalTasks: 60,
      creditScore: 100,
      status: 'Active',
      withdrawalSwitch: true,
      registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    });

    alert('Registration successful!');
    window.location.href = 'login.html';

  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'auth/email-already-in-use') {
      alert('This email address is already registered. Please log in instead.');
    } else if (error.code === 'auth/weak-password') {
      alert('Password is too weak. Please use at least 6 characters.');
    } else {
      alert('Registration failed: ' + error.message);
    }
  } finally {
    // Restore button state
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Register';
    }
  }
};

/* ========== Dynamic Login Event Logging System (Firestore) ========== */
async function logLoginEvent(username, status, reason = '-', userId = null) {
  try {
    // Write login log to Firestore
    await addDoc(collection(db, 'login_logs'), {
      user: username || 'Unknown',
      userId: userId || null,
      ip: '197.34.242.1',
      type: 'Username password',
      browser: 'Chrome',
      os: 'Windows 11',
      device: 'Desktop',
      status: status,
      reason: reason,
      location: 'Pakistan (Lahore)',
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      createdAt: new Date().toISOString()
    });
    
    // Update lastActive timestamp in Firestore if successful
    if (status === 'Success' && userId) {
      // Find user doc by userId field
      const q = query(collection(db, 'users'), where('userId', '==', String(userId)));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
        await updateDoc(doc(db, 'users', docSnap.id), {
          lastActive: new Date().toISOString()
        });
      });
    }
  } catch (e) {
    console.error("Failed to log login event to Firestore:", e);
  }
}

/* ========== Login Handling (Firebase Auth + Firestore) ========== */
window.handleLogin = async function() {
  const emailInput = document.getElementById('loginEmail');
  const phoneInput = document.getElementById('loginPhone');
  const passwordInput = document.getElementById('loginPassword');
  const captchaInput = document.getElementById('loginCaptchaAnswer');

  if (!emailInput || !phoneInput || !passwordInput || !captchaInput) {
    window.location.href = 'home.html';
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const captchaAns = captchaInput.value.trim();

  if (!email || !password || !captchaAns) {
    alert('Please enter your email address, password, and captcha.');
    return;
  }

  // Validate Math Captcha
  const userAns = parseInt(captchaAns);
  if (isNaN(userAns) || userAns !== window.captchaAnswer) {
    alert('Invalid captcha');
    if (window.generateNewCaptcha) window.generateNewCaptcha();
    return;
  }

  // Disable button and show loading state
  const btn = document.querySelector('.auth-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Signing in...';
  }

  try {
    // 1. Sign in via Firebase Auth with real email
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUid = userCredential.user.uid;

    // 2. Load user profile from Firestore
    const userDocRef = doc(db, 'users', firebaseUid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      // Auth succeeded but no Firestore profile — this shouldn't happen
      logLoginEvent(email, 'Failure', 'User profile not found in database');
      alert('Account error. Please contact support.');
      return;
    }

    const userData = userSnap.data();

    // 3. Store Firebase UID for session management
    localStorage.setItem('firestoreUid', firebaseUid);

    // 4. Sync critical user fields to localStorage for synchronous page reads
    localStorage.setItem('nickname', userData.nickname || 'User');
    localStorage.setItem('phone', userData.phone || '');
    localStorage.setItem('userId', userData.userId || '');
    localStorage.setItem('invitationCode', userData.invitationCode || '');
    localStorage.setItem('balance', String(userData.balance || 0));
    localStorage.setItem('balance_' + userData.userId, String(userData.balance || 0));
    localStorage.setItem('trc20_address', userData.trc20_address || '');
    localStorage.setItem('withdraw_password', userData.withdraw_password || '');
    localStorage.setItem('completedTasks', String(userData.completedTasks || 0));
    localStorage.setItem('completedTasks_' + userData.userId, String(userData.completedTasks || 0));
    localStorage.setItem('totalTasks_' + userData.userId, String(userData.totalTasks || 60));
    localStorage.setItem('orderGrab_' + userData.userId, userData.orderGrab ? '1' : '0');

    // 5. Log successful login to Firestore
    logLoginEvent(userData.nickname, 'Success', '-', userData.userId);

    // 6. Update lastActive in Firestore
    await updateDoc(userDocRef, {
      lastActive: new Date().toISOString()
    });

    window.location.href = 'home.html';

  } catch (error) {
    console.error('Login error:', error);

    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      logLoginEvent(email, 'Failure', 'Incorrect email address or password');
      alert('Incorrect email address or password.');
    } else if (error.code === 'auth/too-many-requests') {
      alert('Too many failed login attempts. Please try again later.');
    } else {
      alert('Login failed: ' + error.message);
    }
  } finally {
    // Restore button state
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Log in';
    }
  }
};

/* ========== Secure Sign-Out Handling ========== */
window.handleSignOut = async function() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Firebase signOut failed:", e);
  }
  // Nuke the ghost data
  const savedTheme = localStorage.getItem('theme');
  localStorage.clear();
  if (savedTheme) localStorage.setItem('theme', savedTheme);
  
  window.location.href = 'login.html';
};

/* ========== Dynamic Task Matching & Products System ========== */

const PRODUCT_TASKS = [
  { title: "TMY 1080P Full HD Portable Mini Projector Upgraded",        image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772207/TMY_1080P_Full_HD_Portable_Mini_Projector_Upgraded_pdd6dt.jpg" },
  { title: "Anker Power Strip Surge Protector 2100J 12 Outlets",        image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772206/Anker_power_strip_surge_protector_dio3e8.jpg" },
  { title: "travel inspira Luggage Scale Portable Digital Hang",         image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772207/travel_inspira_Luggage_Scale_Portable_Digital_Hang_vxcmdb.jpg" },
  { title: "32GB FRAMEO 10.1 Inch Smart WiFi Digital Photo Frame",      image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772205/32GB_FRAMEO_10.1_Inch_Smart_WiFi_Digital_Photo_Frame_ouztns.jpg" },
  { title: "Wireless Bluetooth Earbuds Noise Cancelling IPX7",           image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772207/Wireless_Bluetooth_Earbuds_Noise_Cancelling_IPX7_qrp6tt.jpg" },
  { title: "USB-C Fast Charging Braided Cable 6ft 3-Pack",               image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772207/USB-C_Fast_Charging_Braided_Cable_6ft_3-Pack_jvvlqc.jpg" },
  { title: "LED Strip Lights 32.8ft RGB Color Changing with Remote",     image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772206/LED_Strip_Lights_32.8ft_RGB_Color_Changing_with_Remote_gbnsmp.jpg" },
  { title: "Waterproof Bluetooth Speaker Portable Outdoor IPX5",         image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772207/Waterproof_Bluetooth_Speaker_Portable_Outdoor_IPX5_mtus0p.jpg" },
  { title: "Smart Plug WiFi Outlet Compatible with Alexa 4-Pack",        image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772207/Smart_Plug_WiFi_Outlet_Compatible_with_Alexa_4-Pack_c0hpag.jpg" },
 
  { title: "Silicone Kitchen Utensil Set Non-Stick 12 Piece",            image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772206/Silicone_Kitchen_Utensil_Set_Non-Stick_12_Piece_prymfl.jpg" },
  { title: "Anti-Theft Laptop Backpack with USB Charging Port 15.6in",  image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772206/Bitzee_Interactive_Toy_Digital_Pet_with_15_Animals_elf4wq.jpg" },
  { title: "2025 Upgraded Ultrasonic Pest Repeller Indoor",              image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772205/2025_Upgraded_Ultrasonic_Repeller_Insect_Indoor_R_dcbens.jpg" },
  { title: "Electric Toothbrush Rechargeable with 8 Replacement Heads",      image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772205/Electric_Toothbrush_Rechargeable_with_8_Replacement_Heads_sxkhsa.jpg" },
  { title: "Air Purifier True HEPA Filter for Bedroom 200 sq ft",        image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772205/Air_Purifier_True_HEPA_Filter_for_Bedroom_200_sq_ft_mhpokz.jpg" },
  { title: "Outdoor Security Camera Wireless WiFi Night Vision",          image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772206/Outdoor_Security_Camera_Wireless_WiFi_Night_Vision_liaolg.jpg" },
  { title: "Etekcity Smart Scale for Body Weight FSA HSA Eligible",      image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772206/Etekcity_Smart_Scale_for_Body_Weight_FSAHSA_Eligib_icgygy.jpg" },
  { title: "Digital Kitchen Food Scale 11lb Multifunction LCD",          image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772207/travel_inspira_Luggage_Scale_Portable_Digital_Hang_vxcmdb.jpg" },
  { title: "Nelko Label Maker Machine with Tape P21 Bluetooth",          image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772206/Nelko_Label_Maker_Machine_with_Tape_P21_Bluetooth_yeniyd.jpg" },
  { title: "Laptop Cooling Pad with 5 Quiet Fans USB Powered Blue LED", image: "https://res.cloudinary.com/dzkububir/image/upload/v1779772206/Laptop_Cooling_Pad_with_5_Quiet_Fans_USB_Powered_Blue_LED_nvd2wo.jpg" }
];

function getRandomProduct() {
  let used = [];
  try {
    const stored = sessionStorage.getItem('used_product_indices');
    if (stored) used = JSON.parse(stored);
  } catch (e) {}

  if (used.length >= PRODUCT_TASKS.length) {
    used = [];
  }
  
  let index;
  do {
    index = Math.floor(Math.random() * PRODUCT_TASKS.length);
  } while (used.includes(index));
  
  used.push(index);
  sessionStorage.setItem('used_product_indices', JSON.stringify(used));
  
  const product = PRODUCT_TASKS.at(index);
  if (product && product.img && !product.image) {
    product.image = product.img;
  }
  return product;
}

function getOrAssignProductForTask(task) {
  if (task.productTitle && task.productImage) {
    return {
      title: task.productTitle,
      image: task.productImage
    };
  }
  const product = getRandomProduct();
  
  task.productTitle = product.title;
  task.productImage = product.image;
  
  const tasks = safeGetAssignedTasks();
  const idx = tasks.findIndex(t => t.id === task.id);
  if (idx !== -1) {
    tasks[idx].productTitle = product.title;
    tasks[idx].productImage = product.image;
    localStorage.setItem('assigned_tasks', JSON.stringify(tasks));
  }
  
  return product;
}

function generateTrueFractionalPrice(min, max) {
  let price = min;
  let attempts = 0;
  
  while (attempts < 100) {
    price = min + Math.random() * (max - min);
    price = parseFloat(price.toFixed(2));
    
    const centPart = Math.round(price * 100) % 100;
    if (centPart !== 0 && centPart % 10 !== 0 && price >= min && price <= max) {
      break;
    }
    attempts++;
  }
  
  if (attempts >= 100) {
    price = min + 1.23;
  }
  return parseFloat(price.toFixed(2));
}

function formatCurrentTime() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function showSuccessToast() {
  const toast = document.getElementById('successToast');
  if (!toast) return;
  toast.style.display = 'flex';
  toast.style.opacity = '0';
  toast.style.top = '-50px';
  toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
  toast.offsetHeight; // trigger reflow
  
  toast.style.opacity = '1';
  toast.style.top = '16px';
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.top = '-50px';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 400);
  }, 3000);
}

function showErrorToast() {
  const toast = document.getElementById('errorToast');
  if (!toast) return;
  toast.style.display = 'flex';
  toast.style.opacity = '0';
  toast.style.top = '-50px';
  toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
  toast.offsetHeight; // trigger reflow
  
  toast.style.opacity = '1';
  toast.style.top = '16px';
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.top = '-50px';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 400);
  }, 3000);
}

function getTaskPriceRange(userId) {
  const completedCount = safeGetAssignedTasks().filter(t => t.status === 'Completed').length;
  const raw = localStorage.getItem('tasks_' + userId);
  
  if (!raw) {
    // No admin tasks assigned — default range
    return { min: 2.00, max: 8.00, commission: 0.6 };
  }
  
  try {
    const tasks = JSON.parse(raw);
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return { min: 2.00, max: 8.00, commission: 0.6 };
    }
    
    // Sort tasks by serial threshold (seq) ascending
    const sorted = [...tasks].sort((a, b) => {
      const seqA = a.seq !== undefined ? parseInt(a.seq) : parseInt(a.serial || 0);
      const seqB = b.seq !== undefined ? parseInt(b.seq) : parseInt(b.serial || 0);
      return seqA - seqB;
    });
    
    // Find the highest serial threshold the user has reached or passed
    let activeRange = { min: 2.00, max: 8.00, commission: 0.6 }; // default before first threshold
    
    for (const task of sorted) {
      const serial = task.seq !== undefined ? parseInt(task.seq) : parseInt(task.serial || 0);
      if (completedCount >= serial) {
        activeRange = { min: parseFloat(task.min), max: parseFloat(task.max), commission: parseFloat(task.commission) };
      } else {
        break; // Haven't reached next threshold yet
      }
    }
    return activeRange;
  } catch (e) {
    return { min: 2.00, max: 8.00, commission: 0.6 };
  }
}

function setMatchingLoading(isLoading) {
  const btn = document.getElementById('startMatchingBtn');
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Start matching...';
  } else {
    btn.disabled = false;
    btn.innerHTML = 'START MATCHING';
  }
}

window.startMatching = function() {
  const userId = localStorage.getItem('userId') || '987654321';
  
  // Ensure user data is loaded
  if (!window.currentUserData) {
    alert("User data not loaded yet. Please wait a moment or reload.");
    return;
  }

  // B1 - Grab Gate Check from Firestore profile
  if (window.currentUserData.orderGrab !== true) {
    alert("Order grabbing is not enabled for your account. Please contact support.");
    window.location.href = 'server.html';
    return;
  }

  const balance = window.currentUserData.balance || 0.00;
  
  // SECTION 7: Retrieve price range via escalation threshold logic
  const activeRange = getTaskPriceRange(userId);
  
  // Let's check if there is an actual waiting task assigned by the admin first!
  const assignedTasks = safeGetAssignedTasks();
  const assignedWaitingTask = assignedTasks.find(t => t.status === 'Waiting');
  
  let currentTask;
  if (assignedWaitingTask) {
    currentTask = {
      id: assignedWaitingTask.id,
      min: parseFloat(assignedWaitingTask.min),
      max: parseFloat(assignedWaitingTask.max),
      commission: parseFloat(assignedWaitingTask.commission),
      status: 'Waiting',
      isDefault: false,
      _docId: assignedWaitingTask._docId
    };
  } else {
    // Construct default task object
    currentTask = {
      id: 'T_' + Math.floor(Math.random() * 900000 + 100000),
      min: activeRange.min,
      max: activeRange.max,
      commission: activeRange.commission,
      status: 'Waiting',
      isDefault: true
    };
  }
  
  const minRequired = Math.max(1.0, currentTask.min);
  
  if (balance < minRequired) {
    const diff = minRequired - balance;
    const diffValEl = document.getElementById('insufficientDiffVal');
    if (diffValEl) diffValEl.textContent = `Difference ${diff.toFixed(2)} USDT`;
    const reqValEl = document.getElementById('insufficientReqVal');
    if (reqValEl) reqValEl.textContent = `${minRequired.toFixed(2)} USDT`;
    openDialog('insufficientBalanceDialog');
    return;
  }
  
  // Section 4 Loader State Start
  setMatchingLoading(true);
  
  const product = getOrAssignProductForTask(currentTask);
  
  // Calculate true fractional matching details
  const minPossible = currentTask.min;
  const maxPossible = Math.min(currentTask.max, balance);
  const finalAmount = generateTrueFractionalPrice(minPossible, maxPossible);
  const finalReturn = parseFloat((finalAmount * currentTask.commission / 100).toFixed(2));
  
  const completedCount = assignedTasks.filter(t => t.status === 'Completed').length;
  const taskNumber = completedCount + 1;
  const timestamp = formatCurrentTime();
  
  // Section 5: Always 1x
  const quantity = 1;
  
  // Cache matching state
  localStorage.setItem('active_matched_task', JSON.stringify({
    taskId: currentTask.id,
    amount: finalAmount,
    commission: finalReturn,
    title: product.title,
    image: product.image,
    quantity: quantity,
    isDefault: currentTask.isDefault,
    _docId: currentTask._docId || null
  }));
  
  // Inject elements
  const matchedTitleEl = document.getElementById('matchedProductTitle');
  if (matchedTitleEl) matchedTitleEl.textContent = product.title;
  
  const matchedPriceEl = document.getElementById('matchedProductPrice');
  if (matchedPriceEl) matchedPriceEl.textContent = `$${finalAmount.toFixed(2)}`;
  
  const matchedImgEl = document.getElementById('matchedProductImage');
  if (matchedImgEl) {
    matchedImgEl.textContent = '';
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.title;
    img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; border-radius: 8px;';
    matchedImgEl.appendChild(img);
  }
  
  const qtySpan = document.querySelector('#matchedOrderDialog span[style*="monospace"]');
  if (qtySpan) qtySpan.textContent = `x${quantity}`;

  const matchedAmountEl = document.getElementById('matchedAmount');
  if (matchedAmountEl) matchedAmountEl.textContent = (finalAmount * quantity).toFixed(2);
  
  const matchedExpectedReturnEl = document.getElementById('matchedExpectedReturn');
  if (matchedExpectedReturnEl) matchedExpectedReturnEl.textContent = (finalReturn * quantity).toFixed(2);
  
  const matchedTaskNumberEl = document.getElementById('matchedTaskNumber');
  if (matchedTaskNumberEl) matchedTaskNumberEl.textContent = taskNumber;
  
  const matchedTimeEl = document.getElementById('matchedTime');
  if (matchedTimeEl) matchedTimeEl.textContent = timestamp;
  
  // Section 2 Suppress visual laggy delays
  setTimeout(() => {
    openDialog('matchedOrderDialog');
    setMatchingLoading(false); // Section 4 Loader End
  }, 600);
};

window.executeStartTrading = async function() {
  const activeTask = JSON.parse(localStorage.getItem('active_matched_task'));
  if (!activeTask) return;
  
  const firestoreUid = localStorage.getItem('firestoreUid');
  if (!firestoreUid) {
    alert('User session not found.');
    return;
  }
  
  const btn = document.querySelector('#matchedOrderDialog .btn-confirm');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Processing...';
  }

  try {
    const finalAmount = activeTask.amount * activeTask.quantity;
    const finalCommission = activeTask.commission * activeTask.quantity;
    const nowStr = formatCurrentTime();
    
    // 1. Update/Create task in Firestore
    if (activeTask.isDefault) {
      // Create new completed task in tasks collection
      await addDoc(collection(db, 'tasks'), {
        userId: window.currentUserData.userId,
        taskId: activeTask.taskId,
        seq: (window.currentUserData.completedTasks || 0) + 1,
        min: activeTask.amount,
        max: activeTask.amount,
        commission: window.currentUserData.commission || 0.6,
        status: 'Completed',
        actualAmount: finalAmount,
        actualCommission: finalCommission,
        productTitle: activeTask.title,
        productImage: activeTask.image,
        time: nowStr,
        completedTime: nowStr,
        isDefault: true
      });
    } else {
      // Update existing task in Firestore
      if (activeTask._docId) {
        await updateDoc(doc(db, 'tasks', activeTask._docId), {
          status: 'Completed',
          actualAmount: finalAmount,
          actualCommission: finalCommission,
          productTitle: activeTask.title,
          productImage: activeTask.image,
          time: nowStr,
          completedTime: nowStr
        });
      }
    }

    // 2. Update user's profile balance and completedTasks in Firestore
    const currentBalance = parseFloat(window.currentUserData.balance) || 0.00;
    const newBalance = currentBalance + finalCommission;
    const currentCompleted = parseInt(window.currentUserData.completedTasks) || 0;
    const newCompleted = currentCompleted + 1;

    const userDocRef = doc(db, 'users', firestoreUid);
    await updateDoc(userDocRef, {
      balance: parseFloat(newBalance.toFixed(2)),
      completedTasks: newCompleted,
      lastActive: new Date().toISOString()
    });

    // 3. Update memory cache and localStorage
    window.currentUserData.balance = newBalance;
    window.currentUserData.completedTasks = newCompleted;
    localStorage.setItem('balance', newBalance.toFixed(2));
    localStorage.setItem('balance_' + window.currentUserData.userId, newBalance.toFixed(2));
    localStorage.setItem('completedTasks', String(newCompleted));
    localStorage.setItem('completedTasks_' + window.currentUserData.userId, String(newCompleted));

    // Clear matches
    localStorage.removeItem('active_matched_task');
    
    closeDialog('matchedOrderDialog');
    showSuccessToast();
    renderUserData();
  } catch (error) {
    console.error('Trading execution failed:', error);
    alert('Transaction failed. Please try again.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'SUBMIT ORDER';
    }
  }
};

window.executeCancelTrading = function() {
  closeDialog('matchedOrderDialog');
  showErrorToast();
  localStorage.removeItem('active_matched_task');
};

window.renderDynamicOrdersPage = function() {
  const undoneSection = document.getElementById('undoneOrderSection');
  const finishList = document.getElementById('finishOrderList');
  const orderStatsHeader = document.getElementById('orderStatsHeader');
  
  if (!undoneSection || !finishList) return;
  
  const userId = localStorage.getItem('userId') || '987654321';
  
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', String(userId))
  );
  
  onSnapshot(q, (snapshot) => {
    const tasks = [];
    snapshot.forEach(docSnap => {
      tasks.push({ _docId: docSnap.id, ...docSnap.data() });
    });
    
    // Sort tasks by seq ascending (or by time)
    tasks.sort((a, b) => (a.seq || 0) - (b.seq || 0));
    
    // Update memory cache
    if (window.currentUserData) {
      window.currentUserData._cachedTasks = tasks;
    }
    
    const completedTasks = tasks.filter(t => t.status === 'Completed');
    
    // Sort completed tasks descending by time so the newest completed task is rendered first
    completedTasks.sort((a, b) => {
      return new Date(b.time.replace(/-/g, '/')).getTime() - new Date(a.time.replace(/-/g, '/')).getTime();
    });
    
    const completedCount = completedTasks.length;
    const totalCount = parseInt(localStorage.getItem('totalTasks_' + userId)) || 60;
    
    if (orderStatsHeader) {
      orderStatsHeader.textContent = `${completedCount}/${totalCount}`;
    }
    
    const undoneTasks = tasks.filter(t => t.status === 'Waiting');
    
    // Sync tab labels with current numbers
    const undoneTabBtn = document.querySelector('.order-btn div[data-tab="undone"]');
    const finishTabBtn = document.querySelector('.order-btn div[data-tab="finish"]');
    if (undoneTabBtn) {
      undoneTabBtn.textContent = `Undone (${undoneTasks.length})`;
    }
    if (finishTabBtn) {
      finishTabBtn.textContent = `Finish (${completedTasks.length})`;
    }
    
    // Render undone tab
    if (undoneTasks.length === 0) {
      undoneSection.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted); font-size:13px; font-weight:500;">No pending task assigned by admin.</div>`;
    } else {
      let html = '';
      undoneTasks.forEach(task => {
        const product = getOrAssignProductForTask(task);
        const minAmount = task.min;
        const expectedReturn = minAmount * task.commission / 100;
        
        const productImgHtml = product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">` : '';
        
        html += `
          <div class="order-card" style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 14px; padding: 16px; margin: 12px 16px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; animation: fadeInUp 0.4s ease-out;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-glass); padding-bottom: 8px;">
              <span style="font-size: 11px; color: var(--text-muted); font-family: 'Inter', monospace;">Order: ${task.id}</span>
              <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 600; background: rgba(144, 147, 153, 0.1); color: var(--text-muted);">Waiting</span>
            </div>
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <div style="width: 50px; height: 50px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-glass); padding: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--accent);">
                ${productImgHtml}
              </div>
              <div style="flex: 1;">
                <div style="font-size: 12.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">${product.title}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${task.time}</div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding-top: 8px; text-align: center; border-top: 1px solid var(--border-glass); font-size: 11px; color: var(--text-secondary);">
              <div>
                <div style="color: var(--text-muted); font-size: 10px; margin-bottom: 2px;">Min Amount</div>
                <div style="font-weight: 700; color: var(--text-primary); font-family: 'Inter', monospace;">$${minAmount.toFixed(2)}</div>
              </div>
              <div>
                <div style="color: var(--text-muted); font-size: 10px; margin-bottom: 2px;">Commission</div>
                <div style="font-weight: 700; color: #39a0c1; font-family: 'Inter', monospace;">${task.commission.toFixed(1)}%</div>
              </div>
              <div>
                <div style="color: var(--text-muted); font-size: 10px; margin-bottom: 2px;">Expected Return</div>
                <div style="font-weight: 700; color: var(--success); font-family: 'Inter', monospace;">+$${expectedReturn.toFixed(2)}</div>
              </div>
            </div>
          </div>
        `;
      });
      undoneSection.innerHTML = html;
    }
    
    // Render finished tab
    if (completedTasks.length === 0) {
      finishList.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted); font-size:13px; font-weight:500;">No completed tasks yet. Go to Trade to match and trade tasks.</div>`;
    } else {
      let html = '';
      completedTasks.forEach(task => {
        const productTitle = task.productTitle || "Precision Review Product";
        const productImgHtml = task.productImage ? `<img src="${escapeHtml(task.productImage)}" alt="${escapeHtml(productTitle)}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">` : '';
        const taskAmount = parseFloat(task.actualAmount || task.min || 0);
        const taskCommission = parseFloat(task.commission || 0);
        const taskReturn = parseFloat(task.actualCommission || 0);
        
        html += `
          <div class="order-card" style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 14px; padding: 16px; margin: 12px 16px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; animation: fadeInUp 0.4s ease-out;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-glass); padding-bottom: 8px;">
              <span style="font-size: 11px; color: var(--text-muted); font-family: 'Inter', monospace;">Order: ${task.id}</span>
              <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 600; background: rgba(62, 154, 137, 0.1); color: var(--success);">Finish</span>
            </div>
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <div style="width: 50px; height: 50px; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-glass); padding: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--success);">
                ${productImgHtml}
              </div>
              <div style="flex: 1;">
                <div style="font-size: 12.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">${productTitle}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${task.time}</div>
              </div>
            </div>
            <div style="grid-template-columns: repeat(3, 1fr); gap: 8px; padding-top: 8px; text-align: center; border-top: 1px solid var(--border-glass); font-size: 11px; color: var(--text-secondary); display: grid;">
              <div>
                <div style="color: var(--text-muted); font-size: 10px; margin-bottom: 2px;">Amount</div>
                <div style="font-weight: 700; color: var(--text-primary); font-family: 'Inter', monospace;">$${taskAmount.toFixed(2)}</div>
              </div>
              <div>
                <div style="color: var(--text-muted); font-size: 10px; margin-bottom: 2px;">Commission</div>
                <div style="font-weight: 700; color: #39a0c1; font-family: 'Inter', monospace;">${taskCommission.toFixed(1)}%</div>
              </div>
              <div>
                <div style="color: var(--text-muted); font-size: 10px; margin-bottom: 2px;">Return</div>
                <div style="font-weight: 700; color: var(--success); font-family: 'Inter', monospace;">+$${taskReturn.toFixed(2)}</div>
              </div>
            </div>
          </div>
        `;
      });
      finishList.innerHTML = html;
    }
  });
};

/* ========== Copy Deposit Address ========== */
window.copyDepositAddress = function() {
  const addrText = document.getElementById('depositAddress').textContent;
  navigator.clipboard.writeText(addrText).then(() => {
    alert('Address copied successfully!');
  }).catch(err => {
    // Fallback
    const el = document.createElement('textarea');
    el.value = addrText;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert('Address copied successfully!');
  });
};

/* ========== User Info Dialog Update Handlers ========== */
window.updateNickname = async function() {
  const input = document.getElementById('inputNewNickname');
  if (!input) return;
  const nickname = input.value.trim();
  if (!nickname) {
    alert('Please enter a valid nickname.');
    return;
  }
  
  const firestoreUid = localStorage.getItem('firestoreUid');
  if (!firestoreUid) return;

  try {
    await updateDoc(doc(db, 'users', firestoreUid), {
      nickname: nickname
    });
    
    localStorage.setItem('nickname', nickname);
    if (window.currentUserData) window.currentUserData.nickname = nickname;
    
    closeDialog('nicknameDialog');
    alert('Nickname updated successfully!');
    renderUserData();
  } catch (error) {
    console.error('Failed to update nickname in Firestore:', error);
    alert('Failed to update nickname.');
  }
};

window.updatePassword = async function() {
  const oldPass = document.getElementById('inputOldPassword').value;
  const newPass = document.getElementById('inputNewPassword').value;
  const confirmPass = document.getElementById('inputConfirmPassword').value;
  
  if (!oldPass || !newPass || !confirmPass) {
    alert('Please fill in all fields.');
    return;
  }
  
  const firestoreUid = localStorage.getItem('firestoreUid');
  if (!firestoreUid) return;

  try {
    const userDocRef = doc(db, 'users', firestoreUid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return;
    const userData = userSnap.data();

    // Check old password. If not set yet in Firestore, default to '123456'
    const storedPass = userData.password || '123456';
    if (oldPass !== storedPass) {
      alert('Incorrect old password.');
      return;
    }
    
    if (newPass !== confirmPass) {
      alert('New passwords do not match.');
      return;
    }

    // Update in Firestore
    await updateDoc(userDocRef, {
      password: newPass
    });
    
    // Also update in Firebase Auth if current user is active
    const user = auth.currentUser;
    if (user) {
      await user.updatePassword(newPass);
    }
    
    localStorage.setItem('password', newPass);
    closeDialog('passwordDialog');
    alert('Password updated successfully!');
  } catch (error) {
    console.error('Failed to update password:', error);
    alert('Failed to update password: ' + error.message);
  }
};

window.updateWithdrawPassword = async function() {
  const newWithdraw = document.getElementById('inputNewWithdrawPassword').value;
  const confirmWithdraw = document.getElementById('inputConfirmWithdrawPassword').value;
  
  if (!newWithdraw || !confirmWithdraw) {
    alert('Please fill in all fields.');
    return;
  }
  
  if (newWithdraw !== confirmWithdraw) {
    alert('Withdrawal passwords do not match.');
    return;
  }
  
  const firestoreUid = localStorage.getItem('firestoreUid');
  if (!firestoreUid) return;

  try {
    await updateDoc(doc(db, 'users', firestoreUid), {
      withdraw_password: newWithdraw
    });
    
    localStorage.setItem('withdraw_password', newWithdraw);
    if (window.currentUserData) window.currentUserData.withdraw_password = newWithdraw;
    
    closeDialog('withdrawPasswordDialog');
    alert('Withdrawal password updated successfully!');
  } catch (error) {
    console.error('Failed to update withdraw password:', error);
    alert('Failed to update withdrawal password.');
  }
};

window.updateWithdrawAddress = async function() {
  const address = document.getElementById('inputNewAddress').value.trim();
  if (!address) {
    alert('Please enter a valid TRC-20 address.');
    return;
  }
  
  const firestoreUid = localStorage.getItem('firestoreUid');
  if (!firestoreUid) return;

  try {
    await updateDoc(doc(db, 'users', firestoreUid), {
      trc20_address: address
    });
    
    localStorage.setItem('trc20_address', address);
    if (window.currentUserData) window.currentUserData.trc20_address = address;
    
    closeDialog('addressDialog');
    alert('Withdrawal address updated successfully!');
    renderUserData();
  } catch (error) {
    console.error('Failed to update address:', error);
    alert('Failed to update withdrawal address.');
  }
};

/* ========== Recharge Submission ========== */
window.submitRechargeRequest = async function() {
  const amountInput = document.getElementById('rechargeAmount');
  if (!amountInput) return;
  const amount = parseFloat(amountInput.value);
  if (isNaN(amount) || amount <= 0.1) {
    alert('Please enter a valid amount greater than 0.1 USDT.');
    return;
  }
  
  const currency = document.getElementById('rechargeCurrency').value;
  const protocol = document.getElementById('rechargeProtocol').value;
  const address = document.getElementById('depositAddress').textContent;
  
  const userId = localStorage.getItem('userId') || '987654321';
  const nickname = localStorage.getItem('nickname') || 'User123';
  const phone = localStorage.getItem('phone') || '12345678901';

  const btn = document.querySelector('.btn-confirm');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting...';
  }
  
  try {
    const customId = 'R' + Math.floor(Math.random() * 900000 + 100000);
    const request = {
      type: 'recharge',
      id: customId,
      userId: userId,
      nickname: nickname,
      phone: phone,
      amount: amount,
      currency: currency,
      protocol: protocol,
      address: address,
      status: 'Pending',
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'transactions'), request);
    
    alert('The submission is successful, the system is being processed, please wait ...');
    window.location.href = 'recharge-record.html';
  } catch (error) {
    console.error('Recharge submission failed:', error);
    alert('Submission failed: ' + error.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'CONFIRM RECHARGE';
    }
  }
};

/* ========== Withdrawal Submission ========== */
window.submitWithdrawRequest = async function() {
  const amountInput = document.getElementById('withdrawAmount');
  const addressInput = document.getElementById('withdrawAddressInput');
  if (!amountInput || !addressInput) return;
  
  const amount = parseFloat(amountInput.value);
  const address = addressInput.value.trim();
  
  if (!address) {
    alert('Please enter your TRC-20 withdrawal address.');
    return;
  }
  
  if (isNaN(amount) || amount < 10.0) {
    alert('At least withdrawal amount is 10.00 USDT.');
    return;
  }
  
  const firestoreUid = localStorage.getItem('firestoreUid');
  if (!firestoreUid) {
    alert('User session not found. Please log in again.');
    return;
  }

  const btn = document.querySelector('.btn-confirm');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting...';
  }

  try {
    // 1. Get fresh user data to verify balance and withdrawal switch status
    const userDocRef = doc(db, 'users', firestoreUid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      alert('User profile not found.');
      return;
    }
    const userData = userSnap.data();

    // Check withdrawal switch status
    if (userData.withdrawalSwitch === false) {
      alert('Withdrawal is currently disabled for your account. Please contact support.');
      return;
    }

    const balance = userData.balance || 0;
    if (amount > balance) {
      alert('Insufficient balance.');
      return;
    }

    // 2. Subtract balance and update address immediately in user doc
    const newBalance = balance - amount;
    await updateDoc(userDocRef, {
      balance: parseFloat(newBalance.toFixed(2)),
      trc20_address: address
    });

    // Sync to local window and localStorage cache
    localStorage.setItem('balance', newBalance.toFixed(2));
    localStorage.setItem('balance_' + userData.userId, newBalance.toFixed(2));
    localStorage.setItem('trc20_address', address);
    if (window.currentUserData) {
      window.currentUserData.balance = newBalance;
      window.currentUserData.trc20_address = address;
    }

    // 3. Create withdrawal transaction
    const customId = 'W' + Math.floor(Math.random() * 900000 + 100000);
    const request = {
      type: 'withdraw',
      id: customId,
      userId: userData.userId,
      nickname: userData.nickname,
      phone: userData.phone,
      amount: amount,
      address: address,
      status: 'Pending',
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, 'transactions'), request);

    alert('Withdrawal request submitted successfully! Pending review.');
    window.location.href = 'withdraw-record.html';
  } catch (error) {
    console.error('Withdrawal submission failed:', error);
    alert('Submission failed: ' + error.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'CONFIRM WITHDRAWAL';
    }
  }
};

window.updateWithdrawDetails = function() {
  const amountInput = document.getElementById('withdrawAmount');
  const feeText = document.getElementById('withdrawFeeText');
  if (!amountInput || !feeText) return;
  
  const amount = parseFloat(amountInput.value) || 0;
  feeText.textContent = `Fee: 0% | Actually: ${amount.toFixed(2)} USDT`;
};

/* ========== Dynamic Records Renderers ========== */
window.renderRechargeRecords = function() {
  const listEl = document.querySelector('.record-list');
  if (!listEl) return;
  
  const currentUserId = localStorage.getItem('userId') || '987654321';
  
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', String(currentUserId)),
    where('type', '==', 'recharge')
  );
  
  onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data());
    });
    
    list.sort((a, b) => b.time.localeCompare(a.time));
    
    if (list.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">No records found.</div>`;
      return;
    }
    
    let html = '';
    list.forEach(req => {
      let statusClass = 'pending';
      let statusText = 'To be reviewed';
      if (req.status === 'Approved') {
        statusClass = 'success';
        statusText = 'Examination passed';
      } else if (req.status === 'Rejected') {
        statusClass = 'danger';
        statusText = 'Examination failed';
      }
      
      html += `
        <div class="record-card">
          <div class="record-row">
            <span class="label">Amount</span>
            <span class="value success">${req.amount.toFixed(2)}</span>
          </div>
          <div class="record-row">
            <span class="label">Income</span>
            <span class="value">0.00</span>
          </div>
          <div class="record-row">
            <span class="label">State</span>
            <span class="value ${statusClass}">${statusText}</span>
          </div>
          <div class="record-row">
            <span class="label">Time</span>
            <span class="value">${req.time}</span>
          </div>
        </div>
      `;
    });
    
    listEl.innerHTML = html;
  }, (error) => {
    console.error("Failed to load recharge records:", error);
    listEl.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Error loading records.</div>`;
  });
};

window.renderWithdrawRecords = function() {
  const listEl = document.querySelector('.record-list');
  if (!listEl) return;
  
  const currentUserId = localStorage.getItem('userId') || '987654321';
  
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', String(currentUserId)),
    where('type', '==', 'withdraw')
  );
  
  onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data());
    });
    
    list.sort((a, b) => b.time.localeCompare(a.time));
    
    if (list.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">No records found.</div>`;
      return;
    }
    
    let html = '';
    list.forEach(req => {
      let statusClass = 'pending';
      let statusText = 'To be reviewed';
      if (req.status === 'Approved') {
        statusClass = 'success';
        statusText = 'Examination passed';
      } else if (req.status === 'Rejected') {
        statusClass = 'danger';
        statusText = 'Examination failed';
      }
      
      html += `
        <div class="record-card">
          <div class="record-row">
            <span class="label">Amount</span>
            <span class="value">${req.amount.toFixed(2)}</span>
          </div>
          <div class="record-row">
            <span class="label">State</span>
            <span class="value ${statusClass}">${statusText}</span>
          </div>
          <div class="record-row">
            <span class="label">Time</span>
            <span class="value">${req.time}</span>
          </div>
        </div>
      `;
    });
    
    listEl.innerHTML = html;
  }, (error) => {
    console.error("Failed to load withdraw records:", error);
    listEl.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Error loading records.</div>`;
  });
};

window.generateNewCaptcha = function() {
  const num1 = Math.floor(Math.random() * 9 + 1);
  const num2 = Math.floor(Math.random() * 9 + 1);
  window.captchaAnswer = num1 + num2;
  const captchaBox = document.getElementById('captchaBox');
  if (captchaBox) {
    captchaBox.textContent = `${num1} + ${num2}`;
  }
  
  // Reset entered captcha answer inputs on reload or regeneration
  const regCaptchaAnswer = document.getElementById('registerCaptchaAnswer');
  if (regCaptchaAnswer) regCaptchaAnswer.value = '';
  const logCaptchaAnswer = document.getElementById('loginCaptchaAnswer');
  if (logCaptchaAnswer) logCaptchaAnswer.value = '';
};

/* ========== Dynamic Team Page System & Commission Claims ========== */
window.renderTeamPage = async function() {
  const balanceEl = document.getElementById('teamBalanceVal');
  const commissionEl = document.getElementById('teamCommissionVal');
  const countEl = document.getElementById('teamSubordinateCount');
  const listContainer = document.getElementById('teamMembersListContainer');
  
  if (!balanceEl || !commissionEl || !countEl || !listContainer) return;

  if (!window.currentUserData) return;

  const currentUserId = window.currentUserData.userId;
  const userInvitationCode = window.currentUserData.invitationCode || 'ABCDEF';
  const balanceVal = window.currentUserData.balance || 0.00;
  
  // Render current user's balance
  balanceEl.textContent = `$${balanceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  try {
    // 1. Find all subordinates registered using this user's invitation code
    const q = query(collection(db, 'users'), where('invitedBy', '==', String(userInvitationCode)));
    const snapshot = await getDocs(q);
    const subordinates = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (String(data.userId) !== String(currentUserId)) {
        subordinates.push({ _docId: docSnap.id, ...data });
      }
    });

    // Update total people count
    countEl.textContent = subordinates.length;

    if (subordinates.length === 0) {
      commissionEl.textContent = '$0.00';
      listContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted); font-size:13px; font-weight:500;">No subordinates invited yet.</div>`;
      return;
    }

    let totalTeamCommission = 0;
    let html = '';

    for (const sub of subordinates) {
      // 2. Fetch completed task commissions for this subordinate from Firestore tasks
      let subCompletedCommissions = 0;
      try {
        const tasksQ = query(
          collection(db, 'tasks'),
          where('userId', '==', String(sub.userId)),
          where('status', '==', 'Completed')
        );
        const tasksSnapshot = await getDocs(tasksQ);
        tasksSnapshot.forEach(taskSnap => {
          const taskData = taskSnap.data();
          subCompletedCommissions += (taskData.actualCommission || 0);
        });
      } catch (e) {
        console.error("Failed to fetch tasks for subordinate " + sub.userId, e);
      }

      // Dynamic 10% commission contributed by this subordinate
      const subordinateContribution = subCompletedCommissions * 0.10;
      totalTeamCommission += subordinateContribution;

      // Mask phone number: e.g. +20 123456789 -> +20 123****789 or 234****5678
      let maskedPhone = sub.phone || 'Unknown';
      if (maskedPhone.length > 7) {
        const parts = maskedPhone.split(' ');
        if (parts.length > 1) {
          const country = parts[0];
          const num = parts[1];
          if (num.length >= 7) {
            maskedPhone = country + ' ' + num.substring(0, 3) + '****' + num.substring(num.length - 4);
          }
        } else {
          maskedPhone = maskedPhone.substring(0, 3) + '****' + maskedPhone.substring(maskedPhone.length - 4);
        }
      }

      // Determine state (Active if they have completed tasks or registered recently)
      const registeredAtDate = sub.registeredAt ? new Date(sub.registeredAt) : new Date();
      const isSubActive = subCompletedCommissions > 0 || (new Date() - registeredAtDate) < 24 * 60 * 60 * 1000;
      const stateClass = isSubActive ? 'active' : 'inactive';
      const stateText = isSubActive ? 'Active' : 'Inactive';

      html += `
        <div class="member-row">
          <div class="member-cell user-col"><span class="username">${maskedPhone}</span></div>
          <div class="member-cell contribution-col"><span class="contribution">$${subordinateContribution.toFixed(2)}</span></div>
          <div class="member-cell state-col"><span class="state ${stateClass}">${stateText}</span></div>
        </div>
      `;
    }

    listContainer.innerHTML = html;

    // Calculate Net Unclaimed Team Commission
    const claimedCommission = parseFloat(window.currentUserData.claimedCommission || 0.00);
    const claimableCommission = Math.max(0, totalTeamCommission - claimedCommission);

    commissionEl.textContent = `$${claimableCommission.toFixed(2)}`;

    // Store transiently for claims
    window.lastCalculatedTeamCommission = totalTeamCommission;
    window.lastClaimableCommission = claimableCommission;
  } catch (error) {
    console.error('Failed to render team page:', error);
  }
};

window.claimTeamCommission = async function() {
  if (!window.currentUserData) return;

  const currentUserId = window.currentUserData.userId;
  const firestoreUid = localStorage.getItem('firestoreUid');
  if (!firestoreUid) return;

  const claimableCommission = window.lastClaimableCommission || 0;
  const totalTeamCommission = window.lastCalculatedTeamCommission || 0;

  if (claimableCommission <= 0) {
    alert("You have no unclaimed team commission to receive.");
    return;
  }

  const btn = document.querySelector('.receive-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Claiming...';
  }

  try {
    // 1. Update user balance and claimedCommission in Firestore
    const currentBalance = parseFloat(window.currentUserData.balance) || 0.00;
    const newBalance = currentBalance + claimableCommission;
    
    const userDocRef = doc(db, 'users', firestoreUid);
    await updateDoc(userDocRef, {
      balance: parseFloat(newBalance.toFixed(2)),
      claimedCommission: parseFloat(totalTeamCommission.toFixed(2))
    });

    // 2. Update local state
    window.currentUserData.balance = newBalance;
    window.currentUserData.claimedCommission = totalTeamCommission;
    localStorage.setItem('balance', newBalance.toFixed(2));
    localStorage.setItem('balance_' + currentUserId, newBalance.toFixed(2));
    localStorage.setItem('claimedCommission_' + currentUserId, totalTeamCommission.toFixed(2));

    // 3. Log to recharge requests list as an approved "Team Payout" top-up in transactions collection!
    const customId = 'R' + Math.floor(Math.random() * 900000 + 100000);
    await addDoc(collection(db, 'transactions'), {
      type: 'recharge',
      id: customId,
      userId: currentUserId,
      nickname: window.currentUserData.nickname || 'User123',
      phone: window.currentUserData.phone || '12345678901',
      amount: claimableCommission,
      currency: 'USDT',
      protocol: 'Team Payout',
      address: 'Claimed Subordinates Payout',
      status: 'Approved',
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      createdAt: serverTimestamp()
    });

    alert(`Received successfully! Added $${claimableCommission.toFixed(2)} team commission to your balance.`);
    
    // Refresh page data
    await window.renderTeamPage();
  } catch (error) {
    console.error('Failed to claim team commission:', error);
    alert('Claim failed. Please try again.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Receive';
    }
  }
};

/* ========== Window Bindings for ES Module Compatibility ========== */
// In ES modules, function declarations are module-scoped. These bindings
// expose functions to the global scope so inline HTML onclick/oninput handlers
// can still call them.
window.checkPasswordStrength = checkPasswordStrength;
window.openDialog = openDialog;
window.closeDialog = closeDialog;
window.renderUserData = renderUserData;
window.safeGetAssignedTasks = safeGetAssignedTasks;
window.fetchAssignedTasksFromFirestore = fetchAssignedTasksFromFirestore;
window.loadCurrentUserFromFirestore = loadCurrentUserFromFirestore;

async function initCustomerRechargePage() {
  try {
    const docRef = doc(db, 'system_config', 'recharge');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const addressType = data.addressType || 'TRC-20';
      const address = data.address || 'TRx7NqFh8Z2kYJg5K9p4YzD2mVwBcQrE8L';
      
      const depositAddrEl = document.getElementById('depositAddress');
      if (depositAddrEl) {
        depositAddrEl.textContent = address;
      }
      
      const protocolSelect = document.getElementById('rechargeProtocol');
      if (protocolSelect) {
        let exists = false;
        for (let i = 0; i < protocolSelect.options.length; i++) {
          if (protocolSelect.options[i].value === addressType) {
            exists = true;
            protocolSelect.selectedIndex = i;
            break;
          }
        }
        if (!exists) {
          const newOpt = document.createElement('option');
          newOpt.value = addressType;
          newOpt.textContent = addressType;
          protocolSelect.appendChild(newOpt);
          protocolSelect.value = addressType;
        }
      }
      
      const labelEl = document.querySelector('.deposit-address .form-label');
      if (labelEl) {
        labelEl.textContent = `The deposit address only supports ${addressType}-USDT`;
      }
    }
  } catch (e) {
    console.error("Failed to load global recharge configuration:", e);
  }
}

window.initCustomerRechargePage = initCustomerRechargePage;
