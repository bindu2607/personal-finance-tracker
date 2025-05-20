// Table scroll logic
const tablePart = document.querySelector(".table-part");
const transactionTable = document.getElementById("transaction-table");

function checkTableScroll() {
    const rowCount = transactionTable.rows.length - 1; // Exclude header
    const maxRowCount = 10;
    if (rowCount > maxRowCount) {
        tablePart.classList.add("scrollable");
    } else {
        tablePart.classList.remove("scrollable");
    }
}
const observer = new MutationObserver(checkTableScroll);
observer.observe(transactionTable, { childList: true, subtree: true });

// Data structures
let transactions = [];
let editedTransaction = null;
let budgets = {};
let goals = [];
let bills = [];
let receipts = {}; // {primeId: receiptURL}
let notifications = [];

// Add Transaction
function addTransaction() {
    const descriptionInput = document.getElementById("description");
    const amountInput = document.getElementById("amount");
    const typeInput = document.getElementById("type");
    const dateInput = document.getElementById("date");
    const categoryInput = document.getElementById("category");
    const receiptInput = document.getElementById("receipt");

    const description = descriptionInput.value;
    const amount = parseFloat(amountInput.value);
    const type = typeInput.value;
    const chosenDate = new Date(dateInput.value);
    const category = categoryInput ? categoryInput.value : "";
    const receiptFile = receiptInput && receiptInput.files[0] ? receiptInput.files[0] : null;
    let receiptUrl = "";

    // Validate
    if (
        description.trim() === "" ||
        isNaN(amount) ||
        isNaN(chosenDate) ||
        !type ||
        !category
    ) {
        return;
    }

    // Receipt preview
    if (receiptFile) {
        receiptUrl = URL.createObjectURL(receiptFile);
    }

    // Transaction object
    const transaction = {
        primeId: chosenDate.getTime(),
        description,
        amount,
        type,
        category,
        receiptUrl
    };
    transactions.push(transaction);
    if (receiptUrl) receipts[transaction.primeId] = receiptUrl;

    // Clear fields
    descriptionInput.value = "";
    amountInput.value = "";
    dateInput.value = "";
    if (categoryInput) categoryInput.value = "";
    if (receiptInput) receiptInput.value = "";

    updateBalance();
    updateTransactionTable();
    updateReports();
    triggerNotifications();
}

// Delete Transaction
function deleteTransaction(primeId) {
    const index = transactions.findIndex((t) => t.primeId === primeId);
    if (index > -1) {
        transactions.splice(index, 1);
        updateBalance();
        updateTransactionTable();
        updateReports();
        triggerNotifications();
    }
}

// Edit Transaction
function editTransaction(primeId) {
    const transaction = transactions.find((t) => t.primeId === primeId);
    if (!transaction) return;
    document.getElementById("description").value = transaction.description;
    document.getElementById("amount").value = transaction.amount;
    document.getElementById("type").value = transaction.type;
    document.getElementById("category").value = transaction.category || "";
    document.getElementById("date").value = formatDateInput(new Date(transaction.primeId));
    editedTransaction = transaction;
    document.getElementById("add-transaction-btn").style.display = "none";
    document.getElementById("save-transaction-btn").style.display = "inline-block";
}

// Save Transaction
function saveTransaction() {
    if (!editedTransaction) return;
    const descriptionInput = document.getElementById("description");
    const amountInput = document.getElementById("amount");
    const typeInput = document.getElementById("type");
    const dateInput = document.getElementById("date");
    const categoryInput = document.getElementById("category");
    const receiptInput = document.getElementById("receipt");

    const description = descriptionInput.value;
    const amount = parseFloat(amountInput.value);
    const type = typeInput.value;
    const chosenDate = new Date(dateInput.value);
    const category = categoryInput ? categoryInput.value : "";
    const receiptFile = receiptInput && receiptInput.files[0] ? receiptInput.files[0] : null;
    let receiptUrl = editedTransaction.receiptUrl;

    if (
        description.trim() === "" ||
        isNaN(amount) ||
        isNaN(chosenDate) ||
        !type ||
        !category
    ) {
        return;
    }

    if (receiptFile) {
        receiptUrl = URL.createObjectURL(receiptFile);
    }

    editedTransaction.description = description;
    editedTransaction.amount = amount;
    editedTransaction.type = type;
    editedTransaction.primeId = chosenDate.getTime();
    editedTransaction.category = category;
    editedTransaction.receiptUrl = receiptUrl;

    descriptionInput.value = "";
    amountInput.value = "";
    dateInput.value = "";
    if (categoryInput) categoryInput.value = "";
    if (receiptInput) receiptInput.value = "";

    editedTransaction = null;
    document.getElementById("add-transaction-btn").style.display = "inline-block";
    document.getElementById("save-transaction-btn").style.display = "none";

    updateBalance();
    updateTransactionTable();
    updateReports();
    triggerNotifications();
}

// Balance
function updateBalance() {
    const balanceElement = document.getElementById("balance");
    let balance = 0.0;
    transactions.forEach((transaction) => {
        if (transaction.type === "income") {
            balance += transaction.amount;
        } else if (transaction.type === "expense") {
            balance -= transaction.amount;
        }
    });
    const currencySelect = document.getElementById("currency");
    const currencyCode = currencySelect ? currencySelect.value : "INR";
    const formattedBalance = formatCurrency(balance, currencyCode);
    balanceElement.textContent = formattedBalance;
    if (balance < 0) {
        balanceElement.classList.remove("positive-balance");
        balanceElement.classList.add("negative-balance");
    } else {
        balanceElement.classList.remove("negative-balance");
        balanceElement.classList.add("positive-balance");
    }

    // Update goal progress
    goals.forEach((g) => {
        g.saved = Math.min(balance, g.amt);
    });
    updateGoalsList();

    // Update budgets
    updateBudgetsList();
}

// Format currency
function formatCurrency(amount, currencyCode) {
    const currencySymbols = { USD: "$", EUR: "€", INR: "₹" };
    const decimalSeparators = { USD: ".", EUR: ",", INR: "." };
    const symbol = currencySymbols[currencyCode] || "";
    const decimalSeparator = decimalSeparators[currencyCode] || ".";
    return symbol + amount.toFixed(2).replace(".", decimalSeparator);
}

// Format date for display
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Format date for input[type="date"]
function formatDateInput(date) {
    return date.toISOString().slice(0, 10);
}

// Update Transaction Table
function updateTransactionTable() {
    const transactionTable = document.getElementById("transaction-table");
    while (transactionTable.rows.length > 1) {
        transactionTable.deleteRow(1);
    }
    transactions.forEach((transaction) => {
        const newRow = transactionTable.insertRow();
        const dateCell = newRow.insertCell();
        dateCell.textContent = formatDate(new Date(transaction.primeId));
        const descriptionCell = newRow.insertCell();
        descriptionCell.textContent = transaction.description;
        const amountCell = newRow.insertCell();
        const currencySelect = document.getElementById("currency");
        const currencyCode = currencySelect ? currencySelect.value : "INR";
        amountCell.textContent = formatCurrency(transaction.amount, currencyCode);
        const typeCell = newRow.insertCell();
        typeCell.textContent = transaction.type;
        const categoryCell = newRow.insertCell();
        categoryCell.textContent = transaction.category || "";
        const receiptCell = newRow.insertCell();
        receiptCell.innerHTML = transaction.receiptUrl ?
            `<a href="${transaction.receiptUrl}" target="_blank">View</a>` :
            "";
        const actionCell = newRow.insertCell();
        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.classList.add("edit-button");
        editButton.addEventListener("click", () =>
            editTransaction(transaction.primeId)
        );
        actionCell.appendChild(editButton);
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.classList.add("delete-button");
        deleteButton.addEventListener("click", () =>
            deleteTransaction(transaction.primeId)
        );
        actionCell.appendChild(deleteButton);
    });
    checkTableScroll();
}

// Budgets
document.getElementById("budget-form").onsubmit = function(e) {
    e.preventDefault();
    const cat = document.getElementById("budget-category").value;
    const amt = parseFloat(document.getElementById("budget-amount").value);
    if (!cat || isNaN(amt)) return;
    budgets[cat] = amt;
    updateBudgetsList();
    triggerNotifications();
    this.reset();
};

function updateBudgetsList() {
    const div = document.getElementById("budgets-list");
    let html = "";
    Object.keys(budgets).forEach((cat) => {
        const spent = transactions
            .filter((t) => t.category === cat && t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);
        html += `<div>${cat}: <b>₹${spent.toFixed(2)}</b> / ₹${budgets[cat].toFixed(
      2
    )} <progress value="${spent}" max="${budgets[cat]}"></progress></div>`;
    });
    div.innerHTML = html;
}

// Financial Goals
document.getElementById("goal-form").onsubmit = function(e) {
    e.preventDefault();
    const name = document.getElementById("goal-name").value;
    const amt = parseFloat(document.getElementById("goal-amount").value);
    if (!name || isNaN(amt)) return;
    goals.push({ name, amt, saved: 0 });
    updateGoalsList();
    this.reset();
};

function updateGoalsList() {
    const div = document.getElementById("goals-list");
    div.innerHTML = goals
        .map(
            (g) =>
            `<div>${g.name}: <progress value="${g.saved}" max="${g.amt}"></progress> ₹${g.saved.toFixed(
          2
        )}/${g.amt.toFixed(2)}</div>`
        )
        .join("");
}

// Bill Reminders
document.getElementById("bill-form").onsubmit = function(e) {
    e.preventDefault();
    const name = document.getElementById("bill-name").value;
    const date = document.getElementById("bill-date").value;
    if (!name || !date) return;
    bills.push({ name, date });
    updateBillsList();
    this.reset();
};

function updateBillsList() {
    const div = document.getElementById("bills-list");
    div.innerHTML = bills
        .map((b) => `<div>${b.name} - Due: ${b.date}</div>`)
        .join("");
}

// Visual Reports (Chart.js)
function updateReports() {
    const ctx = document.getElementById("summary-chart").getContext("2d");
    const catTotals = {};
    transactions.forEach((t) => {
        if (!catTotals[t.category]) catTotals[t.category] = 0;
        if (t.type === "expense") catTotals[t.category] += t.amount;
    });
    if (window.summaryChart) window.summaryChart.destroy();
    window.summaryChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: Object.keys(catTotals),
            datasets: [{
                data: Object.values(catTotals),
                backgroundColor: [
                    "#ff6384",
                    "#36a2eb",
                    "#cc65fe",
                    "#ffce56",
                    "#18ad1d",
                    "#f44336",
                ],
            }, ],
        },
        options: { responsive: true },
    });
    // Monthly summary
    const months = {};
    transactions.forEach((t) => {
        const m = new Date(t.primeId).toISOString().slice(0, 7);
        if (!months[m]) months[m] = { income: 0, expense: 0 };
        if (t.type === "income") months[m].income += t.amount;
        else months[m].expense += t.amount;
    });
    let html =
        "<table><tr><th>Month</th><th>Income</th><th>Expense</th></tr>";
    Object.keys(months).forEach((m) => {
        html += `<tr><td>${m}</td><td>₹${months[m].income.toFixed(
      2
    )}</td><td>₹${months[m].expense.toFixed(2)}</td></tr>`;
    });
    html += "</table>";
    document.getElementById("monthly-summary").innerHTML = html;
}

// Notifications
function triggerNotifications() {
    notifications = [];
    // Budget alerts
    Object.keys(budgets).forEach((cat) => {
        const spent = transactions
            .filter((t) => t.category === cat && t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);
        if (spent > budgets[cat]) notifications.push(`Overspent in ${cat}!`);
    });
    // Bill reminders
    const today = new Date().toISOString().slice(0, 10);
    bills.forEach((b) => {
        if (b.date === today) notifications.push(`Bill due today: ${b.name}`);
    });
    showNotification(notifications.join(" | "));
}

function showNotification(msg) {
    const bar = document.getElementById("notification-bar");
    if (bar) {
        if (msg) {
            bar.textContent = msg;
            bar.style.display = "block";
        } else {
            bar.style.display = "none";
        }
    }
}

// Backup/Restore
window.handleBackup = function() {
    const data = { transactions, budgets, goals, bills, receipts };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "finance-backup.json";
    link.click();
};
window.handleRestore = function() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function() {
            const data = JSON.parse(reader.result);
            transactions = data.transactions || [];
            budgets = data.budgets || {};
            goals = data.goals || [];
            bills = data.bills || [];
            receipts = data.receipts || {};
            updateTransactionTable();
            updateBudgetsList();
            updateGoalsList();
            updateBillsList();
            updateBalance();
            updateReports();
            triggerNotifications();
        };
        reader.readAsText(file);
    };
    input.click();
};

// Export
function handleDownload() {
    const exportFormat = prompt("Select export format: PDF or CSV").toLowerCase();
    if (exportFormat === "pdf") {
        exportToPDF();
    } else if (exportFormat === "csv") {
        exportToCSV();
    } else {
        alert('Invalid export format. Please enter either "PDF" or "CSV".');
    }
}

function exportToPDF() {
    alert(
        "PDF export not implemented in this demo. Use a library like pdfMake for real export."
    );
}

function exportToCSV() {
    const csvContent =
        "Date,Description,Amount,Type,Category\n" +
        transactions
        .map((t) => {
            const date = formatDate(new Date(t.primeId));
            return `${date},${t.description},${t.amount},${t.type},${t.category}`;
        })
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "transactions.csv";
    link.click();
}

// Event listeners
document
    .getElementById("add-transaction-btn")
    .addEventListener("click", addTransaction);
document
    .getElementById("save-transaction-btn")
    .addEventListener("click", saveTransaction);

// Initial load
updateBalance();
updateTransactionTable();
updateBudgetsList();
updateGoalsList();
updateBillsList();
updateReports();
triggerNotifications();