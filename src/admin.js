import { supabase } from './supabaseClient.js';

// CONFIG: Change this to your admin email!
const ADMIN_EMAIL = 'accelastriker@gmail.com';

async function initAdmin() {
  const { data: { session } } = await supabase.auth.getSession();

  // 1. Security Guard
  if (!session || session.user.email !== ADMIN_EMAIL) {
    alert('Access Denied: Admin only.');
    window.location.href = '/';
    return;
  }

  loadData();
}

async function loadData() {
  const loadingEl = document.getElementById('admin-loading');
  const tableEl = document.getElementById('admin-table');
  const tbody = document.getElementById('admin-tbody');

  loadingEl.style.display = 'block';
  tableEl.style.display = 'none';

  try {
    // Fetch profiles and their subscriptions
    // Note: This requires the "Admin can view all" RLS policies to be set in Supabase
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select(`
        email,
        subscriptions (
          plan_id,
          expires_at,
          payment_id
        )
      `)
      .order('created_at', { ascending: false });

    if (pError) throw pError;

    // Process Stats
    let activeCount = 0;
    let totalRevenue = 0;

    tbody.innerHTML = '';

    profiles.forEach(user => {
      // Get the latest subscription for this user
      const latestSub = user.subscriptions?.sort((a, b) =>
        new Date(b.expires_at) - new Date(a.expires_at)
      )[0];

      const tr = document.createElement('tr');

      let status = 'No Sub';
      let statusClass = '';
      let expiryStr = '—';
      let planStr = '—';
      let paymentId = '—';

      if (latestSub) {
        const expiryDate = new Date(latestSub.expires_at);
        const isActive = expiryDate > new Date();

        status = isActive ? 'Active' : 'Expired';
        statusClass = isActive ? 'status-active' : 'status-expired';
        expiryStr = expiryDate.toLocaleDateString();
        planStr = latestSub.plan_id.toUpperCase();
        paymentId = latestSub.payment_id;

        if (isActive) activeCount++;
      }

      tr.innerHTML = `
        <td class="email-cell">${user.email}</td>
        <td>${planStr}</td>
        <td class="date-cell">${expiryStr}</td>
        <td><span class="status-pill ${statusClass}">${status}</span></td>
        <td class="date-cell">${paymentId}</td>
      `;
      tbody.appendChild(tr);
    });

    // Update Stats
    document.getElementById('stat-total-users').textContent = profiles.length;
    document.getElementById('stat-active-subs').textContent = activeCount;
    document.getElementById('stat-revenue').textContent = `₹${profiles.length * 99}+`; // Simplified estimate

    loadingEl.style.display = 'none';
    tableEl.style.display = 'table';

  } catch (err) {
    console.error('Admin Load Error:', err);
    loadingEl.innerHTML = `
      <div style="color: var(--red); padding: 2rem;">
        <h3>Database Error</h3>
        <p>${err.message || 'Unknown error occurred.'}</p>
        <p style="font-size: 0.8rem; margin-top: 1rem;">Check if you are logged in as <strong>${ADMIN_EMAIL}</strong></p>
      </div>
    `;
  }
}

document.getElementById('refresh-btn')?.addEventListener('click', loadData);

// Start
initAdmin();
