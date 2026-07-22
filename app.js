/**
 * ONLINE PAYMENT SYSTEM & AUTOMATIC BILL GENERATOR
 * Standalone JavaScript Application Engine
 */

// Global State
const appState = {
  currency: '$',
  theme: 'dark',
  currentView: 'dashboard',
  currentInvoice: {
    id: 'INV-2026-001',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    customerName: 'Acme Corporation',
    customerEmail: 'billing@acme.com',
    customerAddress: '742 Evergreen Terrace, Suite 100',
    status: 'PENDING',
    taxRate: 10,
    discountRate: 5,
    items: [
      { id: 1, name: 'Web Application Development', qty: 1, price: 1200 },
      { id: 2, name: 'Cloud Infrastructure Setup & Security', qty: 1, price: 450 },
      { id: 3, name: 'Annual Maintenance Support', qty: 12, price: 50 }
    ]
  },
  savedInvoices: [],
  paymentMethod: 'card'
};

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  loadSavedData();
  setupEventListeners();
  calculateInvoiceTotals();
  renderItemRows();
  renderLiveInvoice();
  renderDashboard();
  renderHistoryTable();
  updateCreditCardDisplay();
});

/* ---------------- LOCAL STORAGE MANAGEMENT ---------------- */
function loadSavedData() {
  const saved = localStorage.getItem('paybill_invoices');
  if (saved) {
    try {
      appState.savedInvoices = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved invoices:', e);
      appState.savedInvoices = getSampleInvoices();
    }
  } else {
    appState.savedInvoices = getSampleInvoices();
    saveToLocalStorage();
  }
}

function saveToLocalStorage() {
  localStorage.setItem('paybill_invoices', JSON.stringify(appState.savedInvoices));
}

function getSampleInvoices() {
  return [
    {
      id: 'INV-2026-8941',
      date: '2026-07-15',
      dueDate: '2026-07-29',
      customerName: 'Starlight Media Inc.',
      customerEmail: 'accounts@starlight.io',
      customerAddress: '100 Cyberpunk Blvd, Tech City',
      status: 'PAID',
      subtotal: 2250,
      taxAmount: 225,
      discountAmount: 112.50,
      total: 2362.50,
      currency: '$',
      items: [
        { name: 'UI/UX Mobile App Redesign', qty: 1, price: 1800 },
        { name: 'API Integration Service', qty: 1, price: 450 }
      ]
    },
    {
      id: 'INV-2026-7832',
      date: '2026-07-18',
      dueDate: '2026-08-01',
      customerName: 'Nexus Global Solutions',
      customerEmail: 'finance@nexusglobal.com',
      customerAddress: '55 Empire Tower, Suite 400',
      status: 'PENDING',
      subtotal: 1400,
      taxAmount: 140,
      discountAmount: 0,
      total: 1540,
      currency: '$',
      items: [
        { name: 'Cybersecurity Audit & Report', qty: 1, price: 1400 }
      ]
    }
  ];
}

/* ---------------- EVENT LISTENERS ---------------- */
function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) switchView(view);
    });
  });

  // Currency Selector
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.addEventListener('change', (e) => {
      appState.currency = e.target.value;
      renderLiveInvoice();
      renderDashboard();
      renderHistoryTable();
    });
  }

  // Theme Toggle
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      appState.theme = appState.theme === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', appState.theme);
      themeBtn.innerHTML = appState.theme === 'dark' ? '☀️' : '🌙';
      showToast(`Switched to ${appState.theme} theme`);
    });
  }

  // Invoice Inputs Dynamic Sync
  ['cust-name', 'cust-email', 'cust-address', 'inv-number-input', 'inv-date', 'inv-due', 'tax-rate', 'discount-rate'].forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => {
        syncFormToState();
        calculateInvoiceTotals();
        renderLiveInvoice();
      });
    }
  });

  // Add Item Button
  const addItemBtn = document.getElementById('add-item-btn');
  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
      appState.currentInvoice.items.push({
        id: Date.now(),
        name: 'New Custom Service Item',
        qty: 1,
        price: 100
      });
      renderItemRows();
      calculateInvoiceTotals();
      renderLiveInvoice();
    });
  }

  // Quick Action Buttons
  const btnCreateNew = document.getElementById('btn-quick-create');
  if (btnCreateNew) btnCreateNew.addEventListener('click', () => switchView('generator'));

  const btnQuickPay = document.getElementById('btn-quick-pay');
  if (btnQuickPay) btnQuickPay.addEventListener('click', () => switchView('payment'));

  const btnSaveInvoice = document.getElementById('save-invoice-btn');
  if (btnSaveInvoice) {
    btnSaveInvoice.addEventListener('click', () => {
      saveCurrentInvoice('PENDING');
      showToast('Invoice generated & saved to history!');
    });
  }

  const btnPrintInvoice = document.getElementById('print-invoice-btn');
  if (btnPrintInvoice) {
    btnPrintInvoice.addEventListener('click', () => {
      window.print();
    });
  }

  // Payment Form & Card Formatting
  setupPaymentControls();
}

/* ---------------- NAVIGATION ---------------- */
function switchView(viewName) {
  appState.currentView = viewName;
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  const targetView = document.getElementById(`${viewName}-view`);
  const targetNav = document.querySelector(`.nav-btn[data-view="${viewName}"]`);

  if (targetView) targetView.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  // Refresh relevant views
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'history') renderHistoryTable();
  if (viewName === 'payment') updatePaymentViewDetails();
}

/* ---------------- CALCULATIONS ENGINE ---------------- */
function calculateInvoiceTotals() {
  const inv = appState.currentInvoice;
  inv.subtotal = inv.items.reduce((acc, item) => acc + (item.qty * item.price), 0);
  inv.taxAmount = (inv.subtotal * (inv.taxRate || 0)) / 100;
  inv.discountAmount = (inv.subtotal * (inv.discountRate || 0)) / 100;
  inv.total = Math.max(0, inv.subtotal + inv.taxAmount - inv.discountAmount);
}

function syncFormToState() {
  const inv = appState.currentInvoice;
  inv.customerName = document.getElementById('cust-name')?.value || 'Client Name';
  inv.customerEmail = document.getElementById('cust-email')?.value || '';
  inv.customerAddress = document.getElementById('cust-address')?.value || '';
  inv.id = document.getElementById('inv-number-input')?.value || 'INV-2026-001';
  inv.date = document.getElementById('inv-date')?.value || new Date().toISOString().split('T')[0];
  inv.dueDate = document.getElementById('inv-due')?.value || '';
  inv.taxRate = parseFloat(document.getElementById('tax-rate')?.value) || 0;
  inv.discountRate = parseFloat(document.getElementById('discount-rate')?.value) || 0;
}

/* ---------------- DYNAMIC RENDERERS ---------------- */
function renderItemRows() {
  const container = document.getElementById('items-list-container');
  if (!container) return;

  container.innerHTML = '';
  appState.currentInvoice.items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <input type="text" class="form-input item-name" value="${escapeHtml(item.name)}" placeholder="Item description...">
      <input type="number" class="form-input item-qty" min="1" value="${item.qty}">
      <input type="number" class="form-input item-price" min="0" step="0.01" value="${item.price}">
      <div class="item-amount" style="font-weight: 600; text-align: right;">${appState.currency}${(item.qty * item.price).toFixed(2)}</div>
      <button class="icon-btn-danger remove-item-btn" title="Remove Item">&times;</button>
    `;

    // Event handlers for item input
    row.querySelector('.item-name').addEventListener('input', (e) => {
      item.name = e.target.value;
      renderLiveInvoice();
    });

    row.querySelector('.item-qty').addEventListener('input', (e) => {
      item.qty = Math.max(1, parseInt(e.target.value) || 1);
      row.querySelector('.item-amount').textContent = `${appState.currency}${(item.qty * item.price).toFixed(2)}`;
      calculateInvoiceTotals();
      renderLiveInvoice();
    });

    row.querySelector('.item-price').addEventListener('input', (e) => {
      item.price = Math.max(0, parseFloat(e.target.value) || 0);
      row.querySelector('.item-amount').textContent = `${appState.currency}${(item.qty * item.price).toFixed(2)}`;
      calculateInvoiceTotals();
      renderLiveInvoice();
    });

    row.querySelector('.remove-item-btn').addEventListener('click', () => {
      if (appState.currentInvoice.items.length > 1) {
        appState.currentInvoice.items.splice(index, 1);
        renderItemRows();
        calculateInvoiceTotals();
        renderLiveInvoice();
      } else {
        showToast('Invoice must contain at least one item.');
      }
    });

    container.appendChild(row);
  });
}

function renderLiveInvoice() {
  const inv = appState.currentInvoice;
  const curr = appState.currency;

  // Header and Meta
  document.getElementById('prev-inv-num').textContent = inv.id;
  document.getElementById('prev-inv-date').textContent = inv.date;
  document.getElementById('prev-inv-due').textContent = inv.dueDate;
  document.getElementById('prev-cust-name').textContent = inv.customerName;
  document.getElementById('prev-cust-email').textContent = inv.customerEmail;
  document.getElementById('prev-cust-address').textContent = inv.customerAddress;

  // Table items
  const tableBody = document.getElementById('prev-items-body');
  if (tableBody) {
    tableBody.innerHTML = inv.items.map(item => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td style="text-align: center;">${item.qty}</td>
        <td style="text-align: right;">${curr}${item.price.toFixed(2)}</td>
        <td style="text-align: right; font-weight: 600;">${curr}${(item.qty * item.price).toFixed(2)}</td>
      </tr>
    `).join('');
  }

  // Totals
  document.getElementById('prev-subtotal').textContent = `${curr}${inv.subtotal.toFixed(2)}`;
  document.getElementById('prev-tax').textContent = `${curr}${inv.taxAmount.toFixed(2)} (${inv.taxRate}%)`;
  document.getElementById('prev-discount').textContent = `-${curr}${inv.discountAmount.toFixed(2)} (${inv.discountRate}%)`;
  document.getElementById('prev-total').textContent = `${curr}${inv.total.toFixed(2)}`;

  // Stamp Badge
  const stamp = document.getElementById('prev-stamp');
  if (stamp) {
    stamp.className = `inv-status-stamp ${inv.status.toLowerCase()}`;
    stamp.textContent = inv.status;
  }

  // Sync Summary Box in Form
  document.getElementById('summary-subtotal').textContent = `${curr}${inv.subtotal.toFixed(2)}`;
  document.getElementById('summary-tax').textContent = `${curr}${inv.taxAmount.toFixed(2)}`;
  document.getElementById('summary-discount').textContent = `-${curr}${inv.discountAmount.toFixed(2)}`;
  document.getElementById('summary-total').textContent = `${curr}${inv.total.toFixed(2)}`;
}

/* ---------------- DASHBOARD & HISTORY ---------------- */
function renderDashboard() {
  const curr = appState.currency;
  const invoices = appState.savedInvoices;

  const totalRevenue = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.total, 0);

  const pendingAmount = invoices
    .filter(inv => inv.status === 'PENDING')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalBills = invoices.length;
  const paidCount = invoices.filter(inv => inv.status === 'PAID').length;

  document.getElementById('stat-total-revenue').textContent = `${curr}${totalRevenue.toFixed(2)}`;
  document.getElementById('stat-pending-amount').textContent = `${curr}${pendingAmount.toFixed(2)}`;
  document.getElementById('stat-total-bills').textContent = totalBills;
  document.getElementById('stat-paid-count').textContent = paidCount;

  // Recent Table
  const recentTable = document.getElementById('recent-transactions-body');
  if (recentTable) {
    recentTable.innerHTML = invoices.slice(0, 5).map(inv => `
      <tr>
        <td style="font-weight: 600;">${inv.id}</td>
        <td>${escapeHtml(inv.customerName)}</td>
        <td>${inv.date}</td>
        <td style="font-weight: 700;">${inv.currency || curr}${inv.total.toFixed(2)}</td>
        <td><span class="badge badge-${inv.status.toLowerCase()}">${inv.status}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="paySpecificInvoice('${inv.id}')">Pay / View</button>
        </td>
      </tr>
    `).join('');
  }
}

function renderHistoryTable() {
  const container = document.getElementById('history-table-body');
  if (!container) return;

  const searchTerm = (document.getElementById('history-search')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('history-filter-status')?.value || 'ALL';

  const filtered = appState.savedInvoices.filter(inv => {
    const matchesSearch = inv.id.toLowerCase().includes(searchTerm) ||
                          inv.customerName.toLowerCase().includes(searchTerm);
    const matchesStatus = filterStatus === 'ALL' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No invoices found matching criteria.</td></tr>`;
    return;
  }

  container.innerHTML = filtered.map(inv => `
    <tr>
      <td style="font-weight: 700;">${inv.id}</td>
      <td>${escapeHtml(inv.customerName)}</td>
      <td>${inv.date}</td>
      <td>${inv.dueDate || '-'}</td>
      <td style="font-weight: 700;">${inv.currency || appState.currency}${inv.total.toFixed(2)}</td>
      <td><span class="badge badge-${inv.status.toLowerCase()}">${inv.status}</span></td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          ${inv.status === 'PENDING' ? `<button class="btn btn-emerald btn-sm" onclick="paySpecificInvoice('${inv.id}')">⚡ Pay Now</button>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="printSavedInvoice('${inv.id}')">🖨️ Print</button>
          <button class="btn btn-rose btn-sm" onclick="deleteInvoice('${inv.id}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Attach search/filter listeners
  const searchInput = document.getElementById('history-search');
  const filterSelect = document.getElementById('history-filter-status');
  if (searchInput) searchInput.oninput = renderHistoryTable;
  if (filterSelect) filterSelect.onchange = renderHistoryTable;
}

function saveCurrentInvoice(status = 'PENDING') {
  syncFormToState();
  calculateInvoiceTotals();

  const invCopy = JSON.parse(JSON.stringify(appState.currentInvoice));
  invCopy.status = status;
  invCopy.currency = appState.currency;

  const existingIndex = appState.savedInvoices.findIndex(item => item.id === invCopy.id);
  if (existingIndex >= 0) {
    appState.savedInvoices[existingIndex] = invCopy;
  } else {
    appState.savedInvoices.unshift(invCopy);
  }

  saveToLocalStorage();
  renderDashboard();
}

function paySpecificInvoice(invId) {
  const inv = appState.savedInvoices.find(item => item.id === invId);
  if (inv) {
    appState.currentInvoice = JSON.parse(JSON.stringify(inv));
    populateGeneratorForm();
    renderLiveInvoice();
    switchView('payment');
  }
}

function printSavedInvoice(invId) {
  const inv = appState.savedInvoices.find(item => item.id === invId);
  if (inv) {
    appState.currentInvoice = JSON.parse(JSON.stringify(inv));
    populateGeneratorForm();
    renderLiveInvoice();
    switchView('generator');
    setTimeout(() => window.print(), 300);
  }
}

function deleteInvoice(invId) {
  if (confirm(`Are you sure you want to delete invoice ${invId}?`)) {
    appState.savedInvoices = appState.savedInvoices.filter(inv => inv.id !== invId);
    saveToLocalStorage();
    renderHistoryTable();
    renderDashboard();
    showToast(`Deleted invoice ${invId}`);
  }
}

function populateGeneratorForm() {
  const inv = appState.currentInvoice;
  if (document.getElementById('cust-name')) document.getElementById('cust-name').value = inv.customerName;
  if (document.getElementById('cust-email')) document.getElementById('cust-email').value = inv.customerEmail;
  if (document.getElementById('cust-address')) document.getElementById('cust-address').value = inv.customerAddress;
  if (document.getElementById('inv-number-input')) document.getElementById('inv-number-input').value = inv.id;
  if (document.getElementById('inv-date')) document.getElementById('inv-date').value = inv.date;
  if (document.getElementById('inv-due')) document.getElementById('inv-due').value = inv.dueDate;
  if (document.getElementById('tax-rate')) document.getElementById('tax-rate').value = inv.taxRate;
  if (document.getElementById('discount-rate')) document.getElementById('discount-rate').value = inv.discountRate;
  renderItemRows();
}

/* ---------------- PAYMENT GATEWAY SIMULATION ---------------- */
function setupPaymentControls() {
  // Method Switcher Tabs
  document.querySelectorAll('.pm-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pm-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.pm-method-form').forEach(f => f.style.display = 'none');

      btn.classList.add('active');
      const method = btn.dataset.method;
      appState.paymentMethod = method;

      const formElem = document.getElementById(`pm-form-${method}`);
      if (formElem) formElem.style.display = 'block';
    });
  });

  // Credit Card Input Formatting & Preview Sync
  const cardNumInput = document.getElementById('card-number-input');
  const cardHolderInput = document.getElementById('card-holder-input');
  const cardExpInput = document.getElementById('card-exp-input');

  if (cardNumInput) {
    cardNumInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 16);
      val = val.replace(/(.{4})/g, '$1 ').trim();
      e.target.value = val;
      updateCreditCardDisplay();
    });
  }

  if (cardHolderInput) {
    cardHolderInput.addEventListener('input', updateCreditCardDisplay);
  }

  if (cardExpInput) {
    cardExpInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 4);
      if (val.length >= 3) val = `${val.substring(0, 2)}/${val.substring(2)}`;
      e.target.value = val;
      updateCreditCardDisplay();
    });
  }

  // Process Payment Submit
  const submitBtn = document.getElementById('process-payment-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      triggerPaymentProcessing();
    });
  }

  // Close Success Modal
  const modalClose = document.getElementById('modal-close-btn');
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      document.getElementById('success-modal').classList.remove('active');
      switchView('history');
    });
  }
}

function updatePaymentViewDetails() {
  const inv = appState.currentInvoice;
  const curr = appState.currency;

  document.getElementById('pay-target-inv-id').textContent = inv.id;
  document.getElementById('pay-target-client').textContent = inv.customerName;
  document.getElementById('pay-target-amount').textContent = `${curr}${inv.total.toFixed(2)}`;
}

function updateCreditCardDisplay() {
  const num = document.getElementById('card-number-input')?.value || '•••• •••• •••• ••••';
  const name = document.getElementById('card-holder-input')?.value || 'YOUR NAME';
  const exp = document.getElementById('card-exp-input')?.value || 'MM/YY';

  document.getElementById('cc-num-display').textContent = num || '•••• •••• •••• ••••';
  document.getElementById('cc-name-display').textContent = name || 'YOUR NAME';
  document.getElementById('cc-exp-display').textContent = exp || 'MM/YY';
}

function triggerPaymentProcessing() {
  const submitBtn = document.getElementById('process-payment-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `⏳ Processing Secure Payment...`;

  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `⚡ Pay Now`;

    // Mark current invoice as paid & update storage
    appState.currentInvoice.status = 'PAID';
    saveCurrentInvoice('PAID');

    // Show Success Modal
    const modal = document.getElementById('success-modal');
    document.getElementById('modal-inv-id').textContent = appState.currentInvoice.id;
    document.getElementById('modal-amount').textContent = `${appState.currency}${appState.currentInvoice.total.toFixed(2)}`;
    modal.classList.add('active');

    // Confetti effect / Toast
    showToast('Payment successful! Invoice receipt updated.');
  }, 1500);
}

/* ---------------- UTILITY FUNCTIONS ---------------- */
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
}
