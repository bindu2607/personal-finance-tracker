// ────────── script.js ──────────

// Table scroll logic
const tablePart = document.querySelector(".table-part");
const transactionTable = document.getElementById("transaction-table");

function checkTableScroll() {
    const rowCount = transactionTable.rows.length - 1;
    tablePart.classList.toggle("scrollable", rowCount > 10);
}
new MutationObserver(checkTableScroll).observe(transactionTable, { childList: true, subtree: true });

// Data structures
let transactions = [];
let editedTransaction = null;
let budgets = {};
let goals = [];
let bills = [];
let receipts = {}; // { primeId: receiptURL }
let notifications = [];

// Persistence helpers
function saveToLocalStorage() {
    const data = { transactions, budgets, goals, bills, receipts };
    localStorage.setItem("financeData", JSON.stringify(data));
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem("financeData");
    if (!stored) return;
    const data = JSON.parse(stored);
    transactions = data.transactions || [];
    budgets = data.budgets || {};
    goals = data.goals || [];
    bills = data.bills || [];
    receipts = data.receipts || {};
    // Refresh UI
    updateBalance();
    updateTransactionTable();
    updateBudgetsList();
    updateGoalsList();
    updateBillsList();
    updateReports();
    triggerNotifications();
}

// Add Transaction
function addTransaction() {
    const descInput = document.getElementById("description");
    const amtInput = document.getElementById("amount");
    const typeInput = document.getElementById("type");
    const dateInput = document.getElementById("date");
    const categoryInput = document.getElementById("category");
    const receiptInput = document.getElementById("receipt");

    const description = descInput.value.trim();
    const amount = parseFloat(amtInput.value);
    const type = typeInput.value;
    const chosenDate = new Date(dateInput.value);
    const category = categoryInput ? categoryInput.value.trim() : "";
    const receiptFile = receiptInput ? .files[0] || null;

    // Validate fields
    if (!description || isNaN(amount) || isNaN(chosenDate.getTime()) || !type || !category) {
        return;
    }

    // Handle receipt file
    let receiptUrl = "";
    if (receiptFile) {
        receiptUrl = URL.createObjectURL(receiptFile);
        receipts[chosenDate.getTime()] = receiptUrl;
    }

    const transaction = {
        primeId: chosenDate.getTime(),
        description,
        amount,
        type,
        category,
        receiptUrl
    };
    transactions.push(transaction);

    // Clear inputs
    descInput.value = "";
    amtInput.value = "";
    dateInput.value = "";
    categoryInput.value = "";
    if (receiptInput) receiptInput.value = "";

    // Persist & refresh
    saveToLocalStorage();
    updateBalance();
    updateTransactionTable();
    updateReports();
    triggerNotifications();
}

// Delete Transaction
function deleteTransaction(primeId) {
    transactions = transactions.filter(t => t.primeId !== primeId);
    delete receipts[primeId];
    saveToLocalStorage();
    updateBalance();
    updateTransactionTable();
    updateReports();
    triggerNotifications();
}

// Edit Transaction
function editTransaction(primeId) {
    const t = transactions.find(t => t.primeId === primeId);
    if (!t) return;
    document.getElementById("description").value = t.description;
    document.getElementById("amount").value = t.amount;
    document.getElementById("type").value = t.type;
    document.getElementById("category").value = t.category;
    document.getElementById("date").value = new Date(primeId).toISOString().slice(0, 10);
    editedTransaction = t;
    document.getElementById("add-transaction-btn").style.display = "none";
    document.getElementById("save-transaction-btn").style.display = "inline-block";
}

// Save Transaction
function saveTransaction() {
    if (!editedTransaction) return;
    const descInput = document.getElementById("description");
    const amtInput = document.getElementById("amount");
    const typeInput = document.getElementById("type");
    const dateInput = document.getElementById("date");
    const categoryInput = document.getElementById("category");
    const receiptInput = document.getElementById("receipt");

    const description = descInput.value.trim();
    const amount = parseFloat(amtInput.value);
    const chosenDate = new Date(dateInput.value);
    const category = categoryInput.value.trim();
    const receiptFile = receiptInput ? .files[0] || null;

    if (!description || isNaN(amount) || isNaN(chosenDate.getTime()) || !category) {
        return;
    }

    // Possibly update receipt
    let receiptUrl = editedTransaction.receiptUrl;
    if (receiptFile) {
        receiptUrl = URL.createObjectURL(receiptFile);
        receipts[chosenDate.getTime()] = receiptUrl;
    }

    editedTransaction.description = description;
    editedTransaction.amount = amount;
    editedTransaction.type = typeInput.value;
    editedTransaction.primeId = chosenDate.getTime();
    editedTransaction.category = category;
    editedTransaction.receiptUrl = receiptUrl;

    // Clear & reset buttons
    descInput.value = "";
    amtInput.value = "";
    dateInput.value = "";
    categoryInput.value = "";
    if (receiptInput) receiptInput.value = "";
    editedTransaction = null;
    document.getElementById("add-transaction-btn").style.display = "inline-block";
    document.getElementById("save-transaction-btn").style.display = "none";

    saveToLocalStorage();
    updateBalance();
    updateTransactionTable();
    updateReports();
    triggerNotifications();
}

// Balance
function updateBalance() {
    const balanceElement = document.getElementById("balance");
    let balance = transactions.reduce((sum, t) =>
        sum + (t.type === "income" ? t.amount : -t.amount), 0);
    const currencyCode = document.getElementById("currency") ? .value || "INR";
    balanceElement.textContent = formatCurrency(balance, currencyCode);

    // Update goals and budgets progress
    goals.forEach(g => g.saved = Math.min(balance, g.amt));
    updateGoalsList();
    updateBudgetsList();
}

// Format currency
function formatCurrency(amount, code) {
    const symbols = { USD: "$", EUR: "€", INR: "₹" };
    const sep = { USD: ".", EUR: ",", INR: "." };
    return (symbols[code] || "") +
        amount.toFixed(2).replace(".", sep[code] || ".");
}

// Format date display
function formatDate(date) {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/` +
        `${String(d.getMonth() + 1).padStart(2, "0")}/` +
        d.getFullYear();
}

// Update Transaction Table
function updateTransactionTable() {
    const tbl = document.getElementById("transaction-table");
    while (tbl.rows.length > 1) tbl.deleteRow(1);
    transactions.forEach(t => {
        const r = tbl.insertRow();
        r.insertCell().textContent = formatDate(t.primeId);
        r.insertCell().textContent = t.description;
        r.insertCell().textContent = formatCurrency(t.amount, document.getElementById("currency") ? .value);
        r.insertCell().textContent = t.type;
        r.insertCell().textContent = t.category;
        const recCell = r.insertCell();
        recCell.innerHTML = t.receiptUrl ?
            `<a href="${t.receiptUrl}" target="_blank">View</a>` :
            "";
        const actionCell = r.insertCell();
        actionCell.innerHTML = `
      <button onclick="editTransaction(${t.primeId})">Edit</button>
      <button onclick="deleteTransaction(${t.primeId})">Delete</button>
    `;
    });
    checkTableScroll();
}

// Budgets
document.getElementById("budget-form").addEventListener("submit", e => {
    e.preventDefault();
    const cat = document.getElementById("budget-category").value.trim();
    const amt = parseFloat(document.getElementById("budget-amount").value);
    if (!cat || isNaN(amt)) return;
    budgets[cat] = amt;
    saveToLocalStorage();
    updateBudgetsList();
    triggerNotifications();
    e.target.reset();
});

function updateBudgetsList() {
    const div = document.getElementById("budgets-list");
    div.innerHTML = Object.entries(budgets)
        .map(([cat, amt]) => {
            const spent = transactions
                .filter(t => t.category === cat && t.type === "expense")
                .reduce((s, t) => s + t.amount, 0);
            return `<div>${cat}: <b>${formatCurrency(spent, "INR")}</b> / ${
        formatCurrency(amt, "INR")} <progress value="${spent}" max="${amt}"></progress></div>`;
        }).join("");
}

// Goals
document.getElementById("goal-form").addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("goal-name").value.trim();
    const amt = parseFloat(document.getElementById("goal-amount").value);
    if (!name || isNaN(amt)) return;
    goals.push({ name, amt, saved: 0 });
    saveToLocalStorage();
    updateGoalsList();
    e.target.reset();
});

function updateGoalsList() {
    const div = document.getElementById("goals-list");
    div.innerHTML = goals.map(g =>
        `<div>${g.name}: <progress value="${g.saved}" max="${g.amt}"></progress> ${
      formatCurrency(g.saved, "INR")}/${formatCurrency(g.amt, "INR")}</div>`
    ).join("");
}

// Bills
document.getElementById("bill-form").addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("bill-name").value.trim();
    const date = document.getElementById("bill-date").value;
    if (!name || !date) return;
    bills.push({ name, date });
    saveToLocalStorage();
    updateBillsList();
    triggerNotifications();
    e.target.reset();
});

function updateBillsList() {
    const div = document.getElementById("bills-list");
    div.innerHTML = bills.map(b =>
        `<div>${b.name} - Due: ${b.date}</div>`
    ).join("");
}

// Reports (Chart.js)
function updateReports() {
    const canvas = document.getElementById("summary-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const totals = {};
    transactions.forEach(t => {
        if (t.type === "expense") {
            totals[t.category] = (totals[t.category] || 0) + t.amount;
        }
    });

    if (window.summaryChart) {
        window.summaryChart.destroy();
    }

    window.summaryChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(totals),
            datasets: [{ data: Object.values(totals) }]
        },
        options: { responsive: true }
    });
}

// Notifications
function triggerNotifications() {
    notifications = [];
    for (let cat in budgets) {
        const spent = transactions
            .filter(t => t.category === cat && t.type === "expense")
            .reduce((s, t) => s + t.amount, 0);
        if (spent > budgets[cat]) notifications.push(`Overspent in ${cat}!`);
    }
    const today = new Date().toISOString().slice(0, 10);
    bills.forEach(b => {
        if (b.date === today) notifications.push(`Bill due today: ${b.name}`);
    });
    const bar = document.getElementById("notification-bar");
    if (bar) {
        bar.textContent = notifications.join(" | ");
        bar.style.display = notifications.length ? "block" : "none";
    }
}

// Backup/Restore
function handleBackup() {
    const blob = new Blob([JSON.stringify({ transactions, budgets, goals, bills, receipts })], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "finance-backup.json";
    a.click();
}

function handleRestore() {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json";
    inp.onchange = e => {
        const reader = new FileReader();
        reader.onload = () => {
            localStorage.setItem("financeData", reader.result);
            loadFromLocalStorage();
        };
        reader.readAsText(e.target.files[0]);
    };
    inp.click();
}

// Export CSV/PDF
function exportToCSV() {
    if (!transactions.length) { alert("No data to export."); return; }
    const rows = [
        ["Date", "Description", "Amount", "Type", "Category"],
        ...transactions.map(t => [
            new Date(t.primeId).toISOString().slice(0, 10),
            t.description,
            t.amount.toFixed(2),
            t.type,
            t.category
        ])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "transactions.csv";
    a.click();
}

function handleDownload() {
    const fmt = prompt("Export as CSV or PDF?").toLowerCase();
    if (fmt === "csv") exportToCSV();
    else if (fmt === "pdf") alert("Use pdfMake or similar library for PDF export.");
    else alert("Invalid format.");
}

// Init on load
window.addEventListener("DOMContentLoaded", () => {
    loadFromLocalStorage();
    document.getElementById("add-transaction-btn").addEventListener("click", addTransaction);
    document.getElementById("save-transaction-btn").addEventListener("click", saveTransaction);
    document.getElementById("export-btn").addEventListener("click", handleDownload);
});
