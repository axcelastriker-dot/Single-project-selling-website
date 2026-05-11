// ── Landing page logic ──────────────────────────────────────────
import './style.css';
import { supabase } from './supabaseClient.js';

const RAZORPAY_KEY = 'rzp_test_SjQRxaKjbOkMtT';
const PLANS = {
  monthly: { amount: 9900,  label: '₹99',  period: 'per month', btnText: 'Subscribe Monthly — ₹99' },
  yearly:  { amount: 79900, label: '₹799', period: 'per year',  btnText: 'Subscribe Yearly — ₹799' },
};

let currentPlan = 'monthly';
let currentUser = null;

// ── Auth & Session Management ────────────────────────────────────
async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  updateNavUI();
}

// Setup auth listener
supabase.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;
  updateNavUI();

  // Handle password recovery link click
  if (event === 'PASSWORD_RECOVERY') {
    openAuthModal();
    showUpdatePasswordForm();
  }
});

// Password Show/Hide Toggle
document.querySelectorAll('.password-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (input) {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? '🙈' : '👁️';
    }
  });
});

checkUser();

const authActions = document.getElementById('auth-actions');
const userMenu = document.getElementById('user-menu');
const userEmailDisplay = document.getElementById('user-email-display');

async function updateNavUI() {
  if (currentUser) {
    if (authActions) authActions.style.display = 'none';
    if (userMenu) {
      userMenu.classList.add('active');
      userEmailDisplay.textContent = currentUser.email.split('@')[0];
    }
    
    // Fetch subscription details
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('plan_id, expires_at')
      .eq('user_id', currentUser.id)
      .order('expires_at', { ascending: false })
      .limit(1);

    const planEl = document.getElementById('sub-detail-plan');
    const expiryEl = document.getElementById('sub-detail-expiry');
    const heroCta = document.getElementById('hero-cta');
    const checkoutBtn = document.getElementById('checkout-btn');
    const btnText = document.getElementById('btn-text');

    if (subs && subs.length > 0) {
      const sub = subs[0];
      const expiryDate = new Date(sub.expires_at);
      const isExpired = expiryDate < new Date();
      
      planEl.textContent = sub.plan_id === 'yearly' ? 'Pro Access (Yearly)' : 'Pro Access (Monthly)';
      planEl.style.color = isExpired ? 'var(--red)' : 'var(--green)';
      expiryEl.textContent = `Expires: ${expiryDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

      if (!isExpired) {
        // User is a subscriber! Update buttons to skip payment
        if (heroCta) {
          heroCta.textContent = 'Open Code Vault';
          heroCta.href = '/viewer.html';
        }
        if (checkoutBtn) {
          checkoutBtn.classList.add('subscribed');
          if (btnText) btnText.textContent = 'Go to Viewer';
        }
      }
    } else {
      planEl.textContent = 'No Active Subscription';
      planEl.style.color = 'var(--text-dim)';
      expiryEl.textContent = 'Unlock the vault below.';
      
      // Reset buttons if no sub
      if (heroCta) {
        heroCta.textContent = 'Subscribe Now';
        heroCta.href = '#pricing';
      }
      if (checkoutBtn) {
        checkoutBtn.classList.remove('subscribed');
        applyPlan(currentPlan); // Restore original pricing text
      }
    }

  } else {
    if (authActions) authActions.style.display = 'flex';
    if (userMenu) userMenu.classList.remove('active');
  }
}

// User Dropdown
const userBtn = document.getElementById('user-btn');
const userDropdown = document.getElementById('user-dropdown');
userBtn?.addEventListener('click', () => {
  userDropdown?.classList.toggle('show');
});
document.addEventListener('click', (e) => {
  if (!userMenu?.contains(e.target)) {
    userDropdown?.classList.remove('show');
  }
});
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  // Clear any existing local subscription for safety
  sessionStorage.removeItem('cv_subscribed');
});

// ── Auth Modal Logic ─────────────────────────────────────────────
const authModal = document.getElementById('auth-modal');
const closeModal = document.getElementById('close-modal');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authError = document.getElementById('auth-error');
const modalTitle = document.getElementById('modal-title');
const modalSub = document.getElementById('modal-sub');
const modalSwitchText = document.getElementById('modal-switch-text');
const modalSwitchLink = document.getElementById('modal-switch-link');
const modalSwitchContainer = document.getElementById('modal-switch-container');

const forgotPasswordLink = document.getElementById('forgot-password-link');
const resetForm = document.getElementById('reset-form');
const backToLogin = document.getElementById('back-to-login');
const resetEmail = document.getElementById('reset-email');
const resetError = document.getElementById('reset-error');

const newPasswordForm = document.getElementById('new-password-form');
const newPassword = document.getElementById('new-password');
const newPasswordError = document.getElementById('new-password-error');

let isLoginMode = false;
let pendingCheckout = false; // true if they clicked subscribe while logged out

function openAuthModal(forCheckout = false) {
  pendingCheckout = forCheckout;
  authModal?.classList.add('active');
  authError.style.display = 'none';
  authForm.reset();
  resetForm.reset();
  newPasswordForm.reset();
  
  // Show default auth form
  authForm.style.display = 'block';
  resetForm.style.display = 'none';
  newPasswordForm.style.display = 'none';
  modalSwitchContainer.style.display = 'block';
}

function showUpdatePasswordForm() {
  modalTitle.textContent = 'Update Password';
  modalSub.textContent = 'Please enter your new password below.';
  authForm.style.display = 'none';
  resetForm.style.display = 'none';
  newPasswordForm.style.display = 'block';
  modalSwitchContainer.style.display = 'none';
}

closeModal?.addEventListener('click', () => {
  authModal?.classList.remove('active');
});

document.getElementById('nav-login-btn')?.addEventListener('click', () => {
  isLoginMode = true;
  updateModalMode();
  openAuthModal();
});
document.getElementById('nav-signup-btn')?.addEventListener('click', () => {
  isLoginMode = false;
  updateModalMode();
  openAuthModal();
});

modalSwitchLink?.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  updateModalMode();
});

function updateModalMode() {
  authError.style.display = 'none';
  if (isLoginMode) {
    modalTitle.textContent = 'Welcome Back';
    modalSub.textContent = 'Log in to access your code vault.';
    authSubmitBtn.textContent = 'Log In';
    modalSwitchText.textContent = "Don't have an account?";
    modalSwitchLink.textContent = 'Sign Up';
  } else {
    modalTitle.textContent = 'Create Account';
    modalSub.textContent = 'Sign up to get access to the code vault.';
    authSubmitBtn.textContent = 'Sign Up';
    modalSwitchText.textContent = 'Already have an account?';
    modalSwitchLink.textContent = 'Log In';
  }
}

authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmail.value;
  const password = authPassword.value;
  authError.style.display = 'none';
  authError.style.color = 'var(--red)'; // Reset color
  
  const originalText = authSubmitBtn.textContent;
  authSubmitBtn.textContent = 'Please wait...';
  authSubmitBtn.disabled = true;

  try {
    let error;
    if (isLoginMode) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      error = signInError;
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      error = signUpError;
      
      // If sign up succeeded but no session is returned, email confirmation is required
      if (!error && data?.user && !data?.session) {
        authError.textContent = 'Success! Please check your email to verify your account.';
        authError.style.color = 'var(--green)';
        authError.style.display = 'block';
        pendingCheckout = false; // Cannot proceed to checkout without verifying
        
        authSubmitBtn.textContent = originalText;
        authSubmitBtn.disabled = false;
        return; // Early return to prevent closing the modal
      }
    }

    if (error) throw error;
    
    // Success
    authModal?.classList.remove('active');
    
    // If they were trying to checkout, trigger it now
    if (pendingCheckout) {
      setTimeout(startRazorpayCheckout, 300);
      pendingCheckout = false;
    }

  } catch (err) {
    authError.style.color = 'var(--red)';
    authError.textContent = err.message || 'Authentication failed.';
    authError.style.display = 'block';
  } finally {
    authSubmitBtn.textContent = originalText;
    authSubmitBtn.disabled = false;
  }
});

// ── Password Reset Flow ───────────────────────────────────────────
forgotPasswordLink?.addEventListener('click', () => {
  modalTitle.textContent = 'Reset Password';
  modalSub.textContent = 'We will send a reset link to your email.';
  authForm.style.display = 'none';
  resetForm.style.display = 'block';
  modalSwitchContainer.style.display = 'none';
});

backToLogin?.addEventListener('click', () => {
  updateModalMode();
  authForm.style.display = 'block';
  resetForm.style.display = 'none';
  modalSwitchContainer.style.display = 'block';
});

resetForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = resetEmail.value;
  const submitBtn = resetForm.querySelector('button');
  const originalText = submitBtn.textContent;
  
  resetError.style.display = 'none';
  submitBtn.textContent = 'Sending...';
  submitBtn.disabled = true;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
    
    resetError.textContent = 'Check your email for the reset link!';
    resetError.style.color = 'var(--green)';
    resetError.style.display = 'block';
  } catch (err) {
    resetError.textContent = err.message || 'Failed to send reset email.';
    resetError.style.color = 'var(--red)';
    resetError.style.display = 'block';
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

newPasswordForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = newPassword.value;
  const submitBtn = newPasswordForm.querySelector('button');
  const originalText = submitBtn.textContent;

  newPasswordError.style.display = 'none';
  submitBtn.textContent = 'Updating...';
  submitBtn.disabled = true;

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    
    alert('Password updated successfully! You can now log in.');
    authModal?.classList.remove('active');
  } catch (err) {
    newPasswordError.textContent = err.message || 'Failed to update password.';
    newPasswordError.style.display = 'block';
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});


// ── Navbar scroll effect ─────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Plan toggle ──────────────────────────────────────────────────
const toggleBtn   = document.getElementById('plan-toggle');
const priceEl     = document.getElementById('plan-price');
const periodEl    = document.getElementById('plan-period');
const btnTextEl   = document.getElementById('btn-text');
const lblMonthly  = document.getElementById('lbl-monthly');
const lblYearly   = document.getElementById('lbl-yearly');

function applyPlan(plan) {
  currentPlan = plan;
  const p = PLANS[plan];
  if (priceEl)  priceEl.textContent  = p.label;
  if (periodEl) periodEl.textContent = p.period;
  if (btnTextEl) btnTextEl.textContent = p.btnText;
  toggleBtn?.classList.toggle('yearly', plan === 'yearly');
  if (lblMonthly) lblMonthly.style.color = plan === 'monthly' ? 'var(--text)' : 'var(--text-dim)';
  if (lblYearly)  lblYearly.style.color  = plan === 'yearly'  ? 'var(--text)' : 'var(--text-dim)';
}

toggleBtn?.addEventListener('click', () => {
  applyPlan(currentPlan === 'monthly' ? 'yearly' : 'monthly');
});

applyPlan('monthly');

// ── FAQ accordion ────────────────────────────────────────────────
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer = btn.nextElementSibling;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.faq-q').forEach(b => {
      b.setAttribute('aria-expanded', 'false');
      b.nextElementSibling?.classList.remove('open');
    });
    if (!expanded) {
      btn.setAttribute('aria-expanded', 'true');
      answer?.classList.add('open');
    }
  });
});

// ── Razorpay checkout ────────────────────────────────────────────
document.getElementById('checkout-btn')?.addEventListener('click', () => {
  const checkoutBtn = document.getElementById('checkout-btn');
  
  // 1. If already subscribed, skip payment and go to viewer
  if (checkoutBtn?.classList.contains('subscribed')) {
    window.location.href = '/viewer.html';
    return;
  }

  // 2. If not logged in, show auth modal
  if (!currentUser) {
    isLoginMode = false; // default to signup for checkout flow
    updateModalMode();
    openAuthModal(true); // pass true for pendingCheckout
    return;
  }

  // 3. Otherwise, start payment
  startRazorpayCheckout();
});

function startRazorpayCheckout() {
  const plan = PLANS[currentPlan];

  const options = {
    key: RAZORPAY_KEY,
    amount: plan.amount,
    currency: 'INR',
    name: 'CodeVault',
    description: `${currentPlan === 'monthly' ? 'Monthly' : 'Yearly'} Pro Access`,
    handler: async function (response) {
      console.log('Payment success:', response.razorpay_payment_id);
      
      const btnTextEl = document.getElementById('btn-text');
      const originalText = btnTextEl?.textContent;
      if (btnTextEl) btnTextEl.textContent = 'Verifying payment...';

      try {
        const { data, error } = await supabase.functions.invoke('verify-razorpay', {
          body: { payment_id: response.razorpay_payment_id, plan_id: currentPlan }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Redirect to viewer
        window.location.href = '/viewer.html';
      } catch (err) {
        console.error('Verification failed:', err);
        alert(`Verification failed: ${err.message}`);
        if (btnTextEl) btnTextEl.textContent = originalText;
      }
    },
    prefill: { name: '', email: currentUser?.email || '', contact: '' },
    theme: { color: '#6366f1' },
    modal: { escape: true },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}

// ── Entrance animations ──────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card, .pricing-card, .faq-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});
