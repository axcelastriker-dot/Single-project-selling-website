// ── Landing page logic ──────────────────────────────────────────
import './style.css';

const RAZORPAY_KEY = 'rzp_test_SjQRxaKjbOkMtT';
const PLANS = {
  monthly: { amount: 9900,  label: '₹99',  period: 'per month', btnText: 'Subscribe Monthly — ₹99' },
  yearly:  { amount: 79900, label: '₹799', period: 'per year',  btnText: 'Subscribe Yearly — ₹799' },
};

let currentPlan = 'monthly';

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
    // Close all
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
  const plan = PLANS[currentPlan];

  const options = {
    key: RAZORPAY_KEY,
    amount: plan.amount,
    currency: 'INR',
    name: 'CodeVault',
    description: `${currentPlan === 'monthly' ? 'Monthly' : 'Yearly'} Pro Access`,
    handler: function (response) {
      console.log('Payment success:', response.razorpay_payment_id);
      // Store subscription info in sessionStorage
      sessionStorage.setItem('cv_subscribed', 'true');
      sessionStorage.setItem('cv_plan', currentPlan);
      sessionStorage.setItem('cv_payment_id', response.razorpay_payment_id);
      sessionStorage.setItem('cv_expires', Date.now() + (currentPlan === 'yearly' ? 365 : 30) * 86400000);
      // Redirect to viewer
      window.location.href = '/viewer.html';
    },
    prefill: { name: '', email: '', contact: '' },
    theme: { color: '#6366f1' },
    modal: { escape: true },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
});

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
