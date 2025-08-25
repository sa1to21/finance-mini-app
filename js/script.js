// Telegram WebApp initialization - moved outside DOMContentLoaded
let tg = window.Telegram?.WebApp || {
    expand: () => {},
    ready: () => {},
    HapticFeedback: null,
    showAlert: null,
    showConfirm: null,
    CloudStorage: null,
    colorScheme: 'dark'
};

tg.expand();
tg.ready();

// Welcome screen - moved outside DOMContentLoaded for global access
function startApp() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    localStorage.setItem('welcome_shown', 'true');
    
    setTimeout(() => {
        if (tg.expand) {
            tg.expand();
        }
    }, 200);
    
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

// Make function globally accessible
window.startApp = startApp;

document.addEventListener("DOMContentLoaded", () => {
    
    setTimeout(() => {
        if (tg.expand) {
            tg.expand();
        }
    }, 100);
    
    function setFullHeight() {
        const vh = window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        document.body.style.minHeight = `${vh}px`;
        document.body.style.height = `${vh}px`;
    }
    
    setFullHeight();
    window.deleteCategory = function(categoryId, type) {
        const category = categories[type][categoryId];
        if (!category || !category.custom) return;

        if (tg.showConfirm) {
            tg.showConfirm(`Удалить категорию "${category.name}"?`, (confirmed) => {
                if (confirmed) {
                    performDeleteCategory(categoryId, type);
                }
            });
        } else {
            if (confirm(`Удалить категорию "${category.name}"?`)) {
                performDeleteCategory(categoryId, type);
            }
        }
    }

    function performDeleteCategory(categoryId, type) {
        delete categories[type][categoryId];
        
        transactions.forEach(transaction => {
            if (transaction.category === categoryId) {
                transaction.category = type === 'income' ? 'other-income' : 'other-expense';
            }
        });

        saveData();
        updateCategories();
        displayCategories();
        updateFilters();

        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }

    // Update categories in dropdowns
    window.updateCategories = function() {
        const type = document.getElementById('type').value;
        const categoryGroup = document.getElementById('category-group');
        const fromAccountGroup = document.getElementById('from-account-group');
        const toAccountGroup = document.getElementById('to-account-group');
        const accountGroup = document.getElementById('account-group');
        const categorySelect = document.getElementById('category');
        
        if (type === 'transfer') {
            categoryGroup.classList.add('hidden');
            fromAccountGroup.classList.remove('hidden');
            toAccountGroup.classList.remove('hidden');
            accountGroup.classList.add('hidden');
            updateAccountSelects();
        } else {
            categoryGroup.classList.remove('hidden');
            fromAccountGroup.classList.add('hidden');
            toAccountGroup.classList.add('hidden');
            accountGroup.classList.remove('hidden');
            
            categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
            const categoryList = categories[type] || {};
            
            Object.entries(categoryList).forEach(([value, categoryData]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = categoryData.name;
                categorySelect.appendChild(option);
            });
        }
        
        updateAccountSelect();
    }

    window.updateEditCategories = function() {
        const type = document.getElementById('edit-type').value;
        const categoryGroup = document.getElementById('edit-category-group');
        const fromAccountGroup = document.getElementById('edit-from-account-group');
        const toAccountGroup = document.getElementById('edit-to-account-group');
        const accountGroup = document.getElementById('edit-account-group');
        const categorySelect = document.getElementById('edit-category');
        
        if (type === 'transfer') {
            categoryGroup.classList.add('hidden');
            fromAccountGroup.classList.remove('hidden');
            toAccountGroup.classList.remove('hidden');
            accountGroup.classList.add('hidden');
            updateEditAccountSelects();
        } else {
            categoryGroup.classList.remove('hidden');
            fromAccountGroup.classList.add('hidden');
            toAccountGroup.classList.add('hidden');
            accountGroup.classList.remove('hidden');
            
            categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
            const categoryList = categories[type] || {};
            
            Object.entries(categoryList).forEach(([value, categoryData]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = categoryData.name;
                categorySelect.appendChild(option);
            });
        }
        
        updateEditAccountSelect();
    }

    // Update period filter
    window.updatePeriodFilter = function() {
        const periodFilter = document.getElementById('period-filter');
        const calendarDateRange = document.getElementById('calendar-date-range');
        
        if (periodFilter.value === 'calendar') {
            calendarDateRange.classList.remove('hidden');
            renderCalendar();
        } else {
            calendarDateRange.classList.add('hidden');
            selectedDate = null;
            selectedRange = { start: null, end: null };
        }
        
        applyFilters();
    }

    // Account select functions
    function updateAccountSelect() {
        const accountSelect = document.getElementById('account');
        if (accountSelect) {
            accountSelect.innerHTML = '<option value="">Выберите счёт</option>';
            
            accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.icon} ${account.name}`;
                accountSelect.appendChild(option);
            });
        }
    }

    function updateAccountSelects() {
        const fromSelect = document.getElementById('from-account');
        const toSelect = document.getElementById('to-account');
        
        [fromSelect, toSelect].forEach(select => {
            if (select) {
                select.innerHTML = '';
                accounts.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = `${account.icon} ${account.name}`;
                    select.appendChild(option);
                });
            }
        });
    }

    function updateEditAccountSelect() {
        const accountSelect = document.getElementById('edit-account');
        if (accountSelect) {
            accountSelect.innerHTML = '<option value="">Выберите счёт</option>';
            
            accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.icon} ${account.name}`;
                accountSelect.appendChild(option);
            });
        }
    }

    function updateEditAccountSelects() {
        const fromSelect = document.getElementById('edit-from-account');
        const toSelect = document.getElementById('edit-to-account');
        
        [fromSelect, toSelect].forEach(select => {
            if (select) {
                select.innerHTML = '';
                accounts.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = `${account.icon} ${account.name}`;
                    select.appendChild(option);
                });
            }
        });
    }

    // Tab switching
    window.showTab = function(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
        });
        
        const targetTab = document.getElementById(tabName + '-tab');
        if (targetTab) {
            targetTab.classList.remove('hidden');
        }
        
        const activeNavItem = document.querySelector(`[onclick="showTab('${tabName}')"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        if (tabName === 'history') {
            updateFilters();
            applyFilters();
        } else if (tabName === 'stats') {
            displayStats();
        } else if (tabName === 'accounts') {
            displayAccounts();
        } else if (tabName === 'categories') {
            displayCategories();
        }

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    // Add transaction
    window.addTransaction = function() {
        const type = document.getElementById('type').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const description = document.getElementById('description').value;

        if (!amount || amount <= 0) {
            if (tg.showAlert) {
                tg.showAlert('Введите корректную сумму');
            } else {
                alert('Введите корректную сумму');
            }
            return;
        }

        if (type === 'transfer') {
            const fromAccountId = document.getElementById('from-account').value;
            const toAccountId = document.getElementById('to-account').value;
            
            if (!fromAccountId || !toAccountId) {
                if (tg.showAlert) {
                    tg.showAlert('Выберите счета для перевода');
                } else {
                    alert('Выберите счета для перевода');
                }
                return;
            }
            
            if (fromAccountId === toAccountId) {
                if (tg.showAlert) {
                    tg.showAlert('Нельзя переводить на тот же счёт');
                } else {
                    alert('Нельзя переводить на тот же счёт');
                }
                return;
            }

            const fromAccount = accounts.find(a => a.id === fromAccountId);
            const toAccount = accounts.find(a => a.id === toAccountId);

            if (fromAccount.balance < amount) {
                if (tg.showAlert) {
                    tg.showAlert('Недостаточно средств на счёте');
                } else {
                    alert('Недостаточно средств на счёте');
                }
                return;
            }

            const transaction = {
                id: Date.now(),
                type: 'transfer',
                amount: amount,
                fromAccount: fromAccountId,
                toAccount: toAccountId,
                description: description || `Перевод ${fromAccount.name} → ${toAccount.name}`,
                date: new Date().toISOString()
            };

            transactions.unshift(transaction);
            fromAccount.balance -= amount;
            toAccount.balance += amount;
        } else {
            const category = document.getElementById('category').value;
            const accountId = document.getElementById('account').value;
            
            if (!category) {
                if (tg.showAlert) {
                    tg.showAlert('Выберите категорию');
                } else {
                    alert('Выберите категорию');
                }
                return;
            }
            
            if (!accountId) {
                if (tg.showAlert) {
                    tg.showAlert('Выберите счёт');
                } else {
                    alert('Выберите счёт');
                }
                return;
            }
            
            const account = accounts.find(a => a.id === accountId);

            const transaction = {
                id: Date.now(),
                type: type,
                amount: amount,
                category: category,
                account: accountId,
                description: description,
                date: new Date().toISOString()
            };

            transactions.unshift(transaction);

            if (type === 'income') {
                account.balance += amount;
            } else {
                account.balance -= amount;
            }
        }

        saveData();
        updateAllBalances();
        clearForm();

        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }

        if (tg.showAlert) {
            tg.showAlert('Операция добавлена!');
        }
    }

    // Edit transaction functions
    window.editTransaction = function(id) {
        const transaction = transactions.find(t => t.id === id);
        if (!transaction) return;

        editingTransactionId = id;

        document.getElementById('edit-type').value = transaction.type;
        document.getElementById('edit-amount').value = transaction.amount;
        document.getElementById('edit-description').value = transaction.description || '';

        if (transaction.type === 'transfer') {
            document.getElementById('edit-from-account').value = transaction.fromAccount;
            document.getElementById('edit-to-account').value = transaction.toAccount;
        } else {
            document.getElementById('edit-category').value = transaction.category;
            document.getElementById('edit-account').value = transaction.account;
        }

        updateEditCategories();
        document.getElementById('edit-modal').classList.remove('hidden');

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    window.closeEditModal = function() {
        document.getElementById('edit-modal').classList.add('hidden');
        editingTransactionId = null;
    }

    window.saveEditTransaction = function() {
        if (!editingTransactionId) return;

        const transaction = transactions.find(t => t.id === editingTransactionId);
        if (!transaction) return;

        const type = document.getElementById('edit-type').value;
        const amount = parseFloat(document.getElementById('edit-amount').value);
        const description = document.getElementById('edit-description').value;

        if (!amount || amount <= 0) {
            if (tg.showAlert) {
                tg.showAlert('Введите корректную сумму');
            } else {
                alert('Введите корректную сумму');
            }
            return;
        }

        // Revert old balance changes
        if (transaction.type === 'transfer') {
            const oldFromAccount = accounts.find(a => a.id === transaction.fromAccount);
            const oldToAccount = accounts.find(a => a.id === transaction.toAccount);
            if (oldFromAccount) oldFromAccount.balance += transaction.amount;
            if (oldToAccount) oldToAccount.balance -= transaction.amount;
        } else {
            const oldAccount = accounts.find(a => a.id === transaction.account);
            if (oldAccount) {
                if (transaction.type === 'income') {
                    oldAccount.balance -= transaction.amount;
                } else {
                    oldAccount.balance += transaction.amount;
                }
            }
        }

        // Update transaction
        if (type === 'transfer') {
            const fromAccountId = document.getElementById('edit-from-account').value;
            const toAccountId = document.getElementById('edit-to-account').value;
            
            if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
                if (tg.showAlert) {
                    tg.showAlert('Выберите разные счета для перевода');
                } else {
                    alert('Выберите разные счета для перевода');
                }
                return;
            }

            const fromAccount = accounts.find(a => a.id === fromAccountId);
            const toAccount = accounts.find(a => a.id === toAccountId);

            if (fromAccount.balance < amount) {
                if (tg.showAlert) {
                    tg.showAlert('Недостаточно средств на счёте');
                } else {
                    alert('Недостаточно средств на счёте');
                }
                return;
            }

            transaction.type = 'transfer';
            transaction.amount = amount;
            transaction.fromAccount = fromAccountId;
            transaction.toAccount = toAccountId;
            transaction.description = description || `Перевод ${fromAccount.name} → ${toAccount.name}`;
            delete transaction.category;
            delete transaction.account;

            fromAccount.balance -= amount;
            toAccount.balance += amount;
        } else {
            const category = document.getElementById('edit-category').value;
            const accountId = document.getElementById('edit-account').value;
            
            if (!category || !accountId) {
                if (tg.showAlert) {
                    tg.showAlert('Выберите категорию и счёт');
                } else {
                    alert('Выберите категорию и счёт');
                }
                return;
            }

            const account = accounts.find(a => a.id === accountId);

            transaction.type = type;
            transaction.amount = amount;
            transaction.category = category;
            transaction.account = accountId;
            transaction.description = description;
            delete transaction.fromAccount;
            delete transaction.toAccount;

            if (type === 'income') {
                account.balance += amount;
            } else {
                account.balance -= amount;
            }
        }

        saveData();
        updateAllBalances();
        applyFilters();
        closeEditModal();

        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }

        if (tg.showAlert) {
            tg.showAlert('Операция обновлена!');
        }
    }

    // Account management
    window.editAccount = function(accountId) {
        const account = accounts.find(a => a.id === accountId);
        if (!account) return;

        editingAccountId = accountId;

        document.getElementById('edit-account-name').value = account.name;
        document.getElementById('edit-account-icon').value = account.icon;
        document.getElementById('account-balance-correction').value = '';

        document.getElementById('edit-account-modal').classList.remove('hidden');

        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    window.closeEditAccountModal = function() {
        document.getElementById('edit-account-modal').classList.add('hidden');
        editingAccountId = null;
    }

    window.saveEditAccount = function() {
        if (!editingAccountId) return;

        const account = accounts.find(a => a.id === editingAccountId);
        if (!account) return;

        const newName = document.getElementById('edit-account-name').value.trim();
        const newIcon = document.getElementById('edit-account-icon').value;
        const balanceCorrection = parseFloat(document.getElementById('account-balance-correction').value) || 0;

        if (!newName) {
            if (tg.showAlert) {
                tg.showAlert('Введите название счёта');
            } else {
                alert('Введите название счёта');
            }
            return;
        }

        const oldName = account.name;
        const oldIcon = account.icon;

        account.name = newName;
        account.icon = newIcon;
        account.balance += balanceCorrection;

        if (balanceCorrection !== 0) {
            const transaction = {
                id: Date.now(),
                type: balanceCorrection > 0 ? 'income' : 'expense',
                amount: Math.abs(balanceCorrection),
                category: balanceCorrection > 0 ? 'other-income' : 'other-expense',
                account: editingAccountId,
                description: `Корректировка баланса счёта "${newName}"`,
                date: new Date().toISOString()
            };
            transactions.unshift(transaction);
        }

        if (oldName !== newName || oldIcon !== newIcon) {
            const transaction = {
                id: Date.now() + 1,
                type: 'account-edit',
                amount: 0,
                account: editingAccountId,
                description: `Изменение счёта: "${oldName}" ${oldIcon} → "${newName}" ${newIcon}`,
                date: new Date().toISOString()
            };
            transactions.unshift(transaction);
        }

        saveData();
        updateAllBalances();
        displayAccounts();
        updateAccountSelect();
        updateFilters();
        closeEditAccountModal();

        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }

        if (tg.showAlert) {
            tg.showAlert('Счёт обновлен!');
        }
    }

    function clearForm() {
        document.getElementById('amount').value = '';
        document.getElementById('description').value = '';
    }

    function updateAllBalances() {
        const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
        const balanceElement = document.getElementById('total-balance');
        if (balanceElement) {
            balanceElement.textContent = formatCurrency(totalBalance);
            
            balanceElement.className = 'total-balance';
            if (totalBalance > 0) {
                balanceElement.classList.add('positive');
            } else if (totalBalance < 0) {
                balanceElement.classList.add('negative');
            }
        }

        const accountsSummary = document.getElementById('accounts-summary');
        if (accountsSummary) {
            accountsSummary.innerHTML = accounts.map(account => 
                `<div class="account-chip">${account.icon} ${formatCurrency(account.balance)}</div>`
            ).join('');
        }
    }

    function updateFilters() {
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="all">Все категории</option>';
            
            const usedCategories = [...new Set(transactions.filter(t => t.category).map(t => t.category))];
            usedCategories.forEach(categoryId => {
                const option = document.createElement('option');
                option.value = categoryId;
                
                let categoryName = categoryId;
                for (const type of ['expense', 'income']) {
                    if (categories[type][categoryId]) {
                        categoryName = categories[type][categoryId].name;
                        break;
                    }
                }
                
                option.textContent = categoryName;
                categoryFilter.appendChild(option);
            });
        }

        const accountFilter = document.getElementById('account-filter');
        if (accountFilter) {
            accountFilter.innerHTML = '<option value="all">Все счета</option>';
            
            accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.icon} ${account.name}`;
                accountFilter.appendChild(option);
            });
        }
    }

    window.applyFilters = function() {
        const periodFilter = document.getElementById('period-filter');
        const categoryFilter = document.getElementById('category-filter');
        const typeFilter = document.getElementById('type-filter');
        const accountFilter = document.getElementById('account-filter');

        if (!periodFilter || !categoryFilter || !typeFilter || !accountFilter) {
            return;
        }

        let filteredTransactions = [...transactions];

        // Date filter
        if (periodFilter.value === 'calendar') {
            if (dateMode === 'single' && selectedDate) {
                const startDate = new Date(selectedDate);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(selectedDate);
                endDate.setHours(23, 59, 59, 999);
                
                filteredTransactions = filteredTransactions.filter(t => {
                    const transactionDate = new Date(t.date);
                    return transactionDate >= startDate && transactionDate <= endDate;
                });
            } else if (dateMode === 'range' && selectedRange.start && selectedRange.end) {
                const startDate = new Date(selectedRange.start);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(selectedRange.end);
                endDate.setHours(23, 59, 59, 999);
                
                filteredTransactions = filteredTransactions.filter(t => {
                    const transactionDate = new Date(t.date);
                    return transactionDate >= startDate && transactionDate <= endDate;
                });
            }
        } else if (periodFilter.value !== 'all') {
            const now = new Date();
            let startDate, endDate;
            
            startDate = new Date();
            switch (periodFilter.value) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date();
                    endDate.setHours(23, 59, 59, 999);
                    break;
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    endDate = now;
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    endDate = now;
                    break;
                case 'quarter':
                    startDate.setMonth(now.getMonth() - 3);
                    endDate = now;
                    break;
            }
            
            if (startDate && endDate) {
                filteredTransactions = filteredTransactions.filter(t => {
                    const transactionDate = new Date(t.date);
                    return transactionDate >= startDate && transactionDate <= endDate;
                });
            }
        }

        if (categoryFilter.value !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilter.value);
        }
        
        if (typeFilter.value !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter.value);
        }
        
        if (accountFilter.value !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => 
                t.account === accountFilter.value || t.fromAccount === accountFilter.value || t.toAccount === accountFilter.value
            );
        }

        displayFilteredTransactions(filteredTransactions);
    }

    function displayFilteredTransactions(filteredTransactions) {
        const listElement = document.getElementById('transaction-list');
        if (!listElement) return;
        
        if (filteredTransactions.length === 0) {
            listElement.innerHTML = '<div class="empty-state"><p>Операций не найдено</p></div>';
            return;
        }

        const transactionsHTML = filteredTransactions.map(transaction => {
            const date = new Date(transaction.date).toLocaleDateString('ru-RU');
            let categoryName = '';
            let accountInfo = '';

            if (transaction.type === 'transfer') {
                const fromAccount = accounts.find(a => a.id === transaction.fromAccount);
                const toAccount = accounts.find(a => a.id === transaction.toAccount);
                categoryName = `${fromAccount?.icon} → ${toAccount?.icon} Перевод`;
            } else if (transaction.type === 'account-edit') {
                categoryName = `⚙️ Изменение счёта`;
                const account = accounts.find(a => a.id === transaction.account);
                accountInfo = `<div class="transaction-account">${account?.icon} ${account?.name}</div>`;
            } else {
                let categoryData = null;
                for (const type of ['expense', 'income']) {
                    if (categories[type][transaction.category]) {
                        categoryData = categories[type][transaction.category];
                        break;
                    }
                }
                categoryName = categoryData ? categoryData.name : transaction.category;
                
                const account = accounts.find(a => a.id === transaction.account);
                accountInfo = `<div class="transaction-account">${account?.icon} ${account?.name}</div>`;
            }
            
            let amountDisplay = '';
            let actionsHtml = '';
            
            if (transaction.type === 'account-edit') {
                amountDisplay = '';
                actionsHtml = '';
            } else {
                amountDisplay = `${transaction.type === 'income' ? '+' : (transaction.type === 'transfer' ? '' : '-')}${formatCurrency(transaction.amount)}`;
                actionsHtml = `
                    <div class="transaction-actions">
                        <button class="edit-btn" onclick="editTransaction(${transaction.id})" title="Редактировать">✏️</button>
                        <button class="delete-btn" onclick="deleteTransaction(${transaction.id})" title="Удалить">🗑️</button>
                    </div>
                `;
            }
            
            return `
                <div class="transaction-item">
                    <div class="transaction-info" ${transaction.type !== 'account-edit' ? `onclick="editTransaction(${transaction.id})"` : ''}>
                        <div class="transaction-category">${categoryName}</div>
                        <div class="transaction-date">${date}</div>
                        ${accountInfo}
                        ${transaction.description ? `<div style="font-size: 12px; color: var(--tg-theme-hint-color, #999);">${transaction.description}</div>` : ''}
                    </div>
                    <div class="transaction-amount ${transaction.type}">
                        ${amountDisplay}
                    </div>
                    ${actionsHtml}
                </div>
            `;
        }).join('');

        listElement.innerHTML = transactionsHTML;
    }

    window.clearFilters = function() {
        const periodFilter = document.getElementById('period-filter');
        const categoryFilter = document.getElementById('category-filter');
        const typeFilter = document.getElementById('type-filter');
        const accountFilter = document.getElementById('account-filter');
        const calendarDateRange = document.getElementById('calendar-date-range');

        if (periodFilter) periodFilter.value = 'all';
        if (categoryFilter) categoryFilter.value = 'all';
        if (typeFilter) typeFilter.value = 'all';
        if (accountFilter) accountFilter.value = 'all';
        if (calendarDateRange) calendarDateRange.classList.add('hidden');
        
        selectedDate = null;
        selectedRange = { start: null, end: null };
        
        applyFilters();
    }

    window.deleteTransaction = function(id) {
        if (tg.showConfirm) {
            tg.showConfirm('Удалить операцию?', (confirmed) => {
                if (confirmed) {
                    performDeleteTransaction(id);
                }
            });
        } else {
            if (confirm('Удалить операцию?')) {
                performDeleteTransaction(id);
            }
        }
    }

    function performDeleteTransaction(id) {
        const transaction = transactions.find(t => t.id === id);
        if (!transaction) return;
        
        if (transaction.type !== 'account-edit') {
            if (transaction.type === 'transfer') {
                const fromAccount = accounts.find(a => a.id === transaction.fromAccount);
                const toAccount = accounts.find(a => a.id === transaction.toAccount);
                if (fromAccount) fromAccount.balance += transaction.amount;
                if (toAccount) toAccount.balance -= transaction.amount;
            } else {
                const account = accounts.find(a => a.id === transaction.account);
                if (account) {
                    if (transaction.type === 'income') {
                        account.balance -= transaction.amount;
                    } else {
                        account.balance += transaction.amount;
                    }
                }
            }
        }

        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateAllBalances();
        applyFilters();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }

    function displayAccounts() {
        const accountsGrid = document.getElementById('accounts-grid');
        if (!accountsGrid) return;
        
        const accountsHTML = accounts.map(account => `
            <div class="account-card">
            <div class="account-card">
                <div class="account-header">
                    <div>
                        <div class="account-name">${account.name}</div>
                    </div>
                    <div class="account-icon">${account.icon}</div>
                </div>
                <div class="account-balance ${account.balance >= 0 ? 'positive' : 'negative'}">
                    ${formatCurrency(account.balance)}
                </div>
                <div class="account-actions">
                    <button class="account-edit-btn" onclick="editAccount('${account.id}')">Редактировать</button>
                    <button class="account-delete-btn" onclick="deleteAccount('${account.id}')">Удалить</button>
                </div>
            </div>
        `).join('');

        accountsGrid.innerHTML = accountsHTML;
    }

    window.addAccount = function() {
        const name = document.getElementById('new-account-name').value.trim();
        const icon = document.getElementById('new-account-icon').value;
        const balance = parseFloat(document.getElementById('new-account-balance').value) || 0;

        if (!name) {
            if (tg.showAlert) {
                tg.showAlert('Введите название счёта');
            } else {
                alert('Введите название счёта');
            }
            return;
        }

        const newAccount = {
            id: 'account_' + Date.now(),
            name: name,
            icon: icon,
            balance: balance
        };

        accounts.push(newAccount);
        
        if (balance !== 0) {
            const transaction = {
                id: Date.now(),
                type: balance > 0 ? 'income' : 'expense',
                amount: Math.abs(balance),
                category: balance > 0 ? 'other-income' : 'other-expense',
                account: newAccount.id,
                description: `Начальный баланс счёта "${name}"`,
                date: new Date().toISOString()
            };
            transactions.unshift(transaction);
        }

        saveData();
        updateAllBalances();
        displayAccounts();
        updateAccountSelect();

        document.getElementById('new-account-name').value = '';
        document.getElementById('new-account-balance').value = '';

        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }

        if (tg.showAlert) {
            tg.showAlert('Счёт добавлен!');
        }
    }

    window.deleteAccount = function(accountId) {
        const account = accounts.find(a => a.id === accountId);
        if (!account) return;
        
        if (tg.showConfirm) {
            tg.showConfirm(`Удалить счёт "${account.name}"? Все связанные операции также будут удалены.`, (confirmed) => {
                if (confirmed) {
                    performDeleteAccount(accountId);
                }
            });
        } else {
            if (confirm(`Удалить счёт "${account.name}"? Все связанные операции также будут удалены.`)) {
                performDeleteAccount(accountId);
            }
        }
    }

    function performDeleteAccount(accountId) {
        transactions = transactions.filter(t => 
            t.account !== accountId && 
            t.fromAccount !== accountId && 
            t.toAccount !== accountId
        );
        
        accounts = accounts.filter(a => a.id !== accountId);
        
        saveData();
        updateAllBalances();
        displayAccounts();
        updateAccountSelect();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }

    function displayStats() {
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalIncomeEl = document.getElementById('total-income');
        const totalExpensesEl = document.getElementById('total-expenses');
        
        if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(income);
        if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(expenses);

        const expensesByCategory = {};
        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
            });

        const expenseHTML = Object.entries(expensesByCategory)
            .sort(([,a], [,b]) => b - a)
            .map(([categoryId, amount]) => {
                let categoryName = categoryId;
                for (const type of ['expense', 'income']) {
                    if (categories[type][categoryId]) {
                        categoryName = categories[type][categoryId].name;
                        break;
                    }
                }
                
                return `
                    <div class="category-item">
                        <span>${categoryName}</span>
                        <span>${formatCurrency(amount)}</span>
                    </div>
                `;
            }).join('');

        const expenseBreakdown = document.getElementById('expense-breakdown');
        if (expenseBreakdown) {
            expenseBreakdown.innerHTML = 
                expenseHTML || '<div class="empty-state">Расходов пока нет</div>';
        }

        const incomesByCategory = {};
        transactions
            .filter(t => t.type === 'income')
            .forEach(t => {
                incomesByCategory[t.category] = (incomesByCategory[t.category] || 0) + t.amount;
            });

        const incomeHTML = Object.entries(incomesByCategory)
            .sort(([,a], [,b]) => b - a)
            .map(([categoryId, amount]) => {
                let categoryName = categoryId;
                for (const type of ['expense', 'income']) {
                    if (categories[type][categoryId]) {
                        categoryName = categories[type][categoryId].name;
                        break;
                    }
                }
                
                return `
                    <div class="category-item">
                        <span>${categoryName}</span>
                        <span style="color: #4CAF50;">${formatCurrency(amount)}</span>
                    </div>
                `;
            }).join('');

        const incomeBreakdown = document.getElementById('income-breakdown');
        if (incomeBreakdown) {
            incomeBreakdown.innerHTML = 
                incomeHTML || '<div class="empty-state">Доходов пока нет</div>';
        }

        const accountsHTML = accounts.map(account => `
            <div class="category-item">
                <span>${account.icon} ${account.name}</span>
                <span style="color: ${account.balance >= 0 ? '#4CAF50' : '#f44336'};">${formatCurrency(account.balance)}</span>
            </div>
        `).join('');

        const accountsBreakdown = document.getElementById('accounts-breakdown');
        if (accountsBreakdown) {
            accountsBreakdown.innerHTML = accountsHTML;
        }
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
    }

    function setupFilterHandlers() {
        const filterElements = [
            'period-filter', 'category-filter', 'type-filter', 'account-filter'
        ];
        
        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', id === 'period-filter' ? updatePeriodFilter : applyFilters);
            }
        });
    }

    async function init() {
        try {
            checkWelcome();
            
            const balanceElement = document.getElementById('total-balance');
            if (balanceElement) {
                balanceElement.textContent = 'Загрузка...';
            }
            
            await loadFromCloud();
            
            updateAllBalances();
            updateCategories();
            setupFilterHandlers();
            
            document.documentElement.style.setProperty('--tg-color-scheme', tg.colorScheme);
            
            console.log('Приложение инициализировано');
        } catch (error) {
            console.error('Ошибка инициализации:', error);
        }
    }

    init();
});addEventListener('resize', setFullHeight);

    // App data
    let transactions = [];
    let accounts = [];
    let categories = {
        expense: {},
        income: {}
    };
    let isLoading = false;
    let editingTransactionId = null;
    let editingAccountId = null;

    // Calendar variables
    let currentCalendarDate = new Date();
    let dateMode = 'single'; // 'single' or 'range'
    let selectedDate = null;
    let selectedRange = { start: null, end: null };

    // Default categories
    const defaultExpenseCategories = {
        'food': { name: '🍕 Еда', icon: '🍕' },
        'transport': { name: '🚗 Транспорт', icon: '🚗' }, 
        'shopping': { name: '🛒 Покупки', icon: '🛒' },
        'entertainment': { name: '🎬 Развлечения', icon: '🎬' },
        'health': { name: '💊 Здоровье', icon: '💊' },
        'bills': { name: '📄 Счета', icon: '📄' },
        'education': { name: '📚 Образование', icon: '📚' },
        'sport': { name: '⚽ Спорт', icon: '⚽' },
        'beauty': { name: '💄 Красота', icon: '💄' },
        'home': { name: '🏠 Дом', icon: '🏠' },
        'other-expense': { name: '📦 Прочее', icon: '📦' }
    };

    const defaultIncomeCategories = {
        'salary': { name: '💰 Зарплата', icon: '💰' },
        'freelance': { name: '💻 Фрилан', icon: '💻' },
        'business': { name: '🏢 Бизнес', icon: '🏢' },
        'investment': { name: '📈 Инвестиции', icon: '📈' },
        'gift': { name: '🎁 Подарок', icon: '🎁' },
        'bonus': { name: '🎯 Премия', icon: '🎯' },
        'sale': { name: '💸 Продажа', icon: '💸' },
        'refund': { name: '↩️ Возврат', icon: '↩️' },
        'other-income': { name: '💵 Прочее', icon: '💵' }
    };

    // Initialize default categories
    function initializeDefaultCategories() {
        if (Object.keys(categories.expense).length === 0) {
            categories.expense = { ...defaultExpenseCategories };
        }
        if (Object.keys(categories.income).length === 0) {
            categories.income = { ...defaultIncomeCategories };
        }
    }

    // Calendar functions
    window.setDateMode = function(mode) {
        dateMode = mode;
        document.querySelectorAll('.date-mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[onclick="setDateMode('${mode}')"]`).classList.add('active');
        
        selectedDate = null;
        selectedRange = { start: null, end: null };
        renderCalendar();
        applyFilters();
    }

    window.changeMonth = function(delta) {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
        renderCalendar();
    }

    function renderCalendar() {
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        
        document.getElementById('calendar-month-year').textContent = 
            `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
        
        const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
        const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
        const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
        
        const daysContainer = document.getElementById('calendar-days');
        daysContainer.innerHTML = '';
        
        // Previous month days
        const prevMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 0);
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonth.getDate() - i;
            const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day);
            const dayElement = createDayElement(day, 'other-month', date);
            daysContainer.appendChild(dayElement);
        }
        
        // Current month days
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
            const dayElement = createDayElement(day, '', date);
            daysContainer.appendChild(dayElement);
        }
        
        // Next month days
        const totalCells = daysContainer.children.length;
        const remainingCells = 42 - totalCells;
        const nextMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1);
        for (let day = 1; day <= remainingCells && day <= 14; day++) {
            const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day);
            const dayElement = createDayElement(day, 'other-month', date);
            daysContainer.appendChild(dayElement);
        }
    }

    function createDayElement(day, className, date) {
        const dayElement = document.createElement('div');
        dayElement.className = `calendar-day ${className}`;
        dayElement.textContent = day;
        dayElement.onclick = () => selectDate(date);
        
        if (dateMode === 'single' && selectedDate && 
            date.toDateString() === selectedDate.toDateString()) {
            dayElement.classList.add('selected');
        } else if (dateMode === 'range') {
            if (selectedRange.start && date.toDateString() === selectedRange.start.toDateString()) {
                dayElement.classList.add('range-start');
            }
            if (selectedRange.end && date.toDateString() === selectedRange.end.toDateString()) {
                dayElement.classList.add('range-end');
            }
            if (selectedRange.start && selectedRange.end && 
                date > selectedRange.start && date < selectedRange.end) {
                dayElement.classList.add('in-range');
            }
        }
        
        return dayElement;
    }

    function selectDate(date) {
        if (dateMode === 'single') {
            selectedDate = date;
        } else {
            if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
                selectedRange = { start: date, end: null };
            } else {
                if (date < selectedRange.start) {
                    selectedRange = { start: date, end: selectedRange.start };
                } else {
                    selectedRange.end = date;
                }
            }
        }
        
        renderCalendar();
        applyFilters();
    }

    // Show sync status
    function showSyncStatus() {
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            syncStatus.classList.remove('hidden');
            setTimeout(() => {
                syncStatus.classList.add('hidden');
            }, 2000);
        }
    }

    // Cloud storage functions
    function saveToCloud() {
        if (isLoading) return;
        showSyncStatus();
        
        try {
            if (tg.CloudStorage) {
                const transactionsData = JSON.stringify(transactions);
                const transactionChunks = [];
                const chunkSize = 900;
                
                for (let i = 0; i < transactionsData.length; i += chunkSize) {
                    transactionChunks.push(transactionsData.slice(i, i + chunkSize));
                }
                
                tg.CloudStorage.setItem('transactions_chunks_count', transactionChunks.length.toString());
                transactionChunks.forEach((chunk, index) => {
                    tg.CloudStorage.setItem(`transactions_${index}`, chunk);
                });

                tg.CloudStorage.setItem('accounts', JSON.stringify(accounts));
                tg.CloudStorage.setItem('categories', JSON.stringify(categories));
                
                console.log('Data saved to Telegram Cloud');
            }
        } catch (error) {
            console.error('Cloud save error:', error);
        }
        
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.setItem('accounts', JSON.stringify(accounts));
        localStorage.setItem('categories', JSON.stringify(categories));
    }

    function loadFromCloud() {
        return new Promise((resolve) => {
            if (!tg.CloudStorage) {
                const localTransactions = localStorage.getItem('transactions');
                const localAccounts = localStorage.getItem('accounts');
                const localCategories = localStorage.getItem('categories');
                transactions = JSON.parse(localTransactions || '[]');
                accounts = JSON.parse(localAccounts || '[]');
                categories = JSON.parse(localCategories || '{"expense": {}, "income": {}}');
                initializeDefaultAccounts();
                initializeDefaultCategories();
                resolve();
                return;
            }

            isLoading = true;
            
            tg.CloudStorage.getItem('transactions_chunks_count', (error, chunksCount) => {
                if (error || !chunksCount) {
                    transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
                    loadAccountsFromCloud(resolve);
                } else {
                    const count = parseInt(chunksCount);
                    let loadedChunks = [];
                    let loadedCount = 0;

                    for (let i = 0; i < count; i++) {
                        tg.CloudStorage.getItem(`transactions_${i}`, (error, chunk) => {
                            if (!error && chunk) {
                                loadedChunks[i] = chunk;
                            }
                            loadedCount++;
                            
                            if (loadedCount === count) {
                                try {
                                    const fullData = loadedChunks.join('');
                                    transactions = JSON.parse(fullData || '[]');
                                } catch (parseError) {
                                    transactions = [];
                                }
                                loadAccountsFromCloud(resolve);
                            }
                        });
                    }
                }
            });
        });
    }

    function loadAccountsFromCloud(callback) {
        if (!tg.CloudStorage) {
            accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            categories = JSON.parse(localStorage.getItem('categories') || '{"expense": {}, "income": {}}');
            initializeDefaultAccounts();
            initializeDefaultCategories();
            isLoading = false;
            updateAllBalances();
            callback();
            return;
        }

        tg.CloudStorage.getItem('accounts', (error, accountsData) => {
            if (!error && accountsData) {
                try {
                    accounts = JSON.parse(accountsData);
                } catch (parseError) {
                    accounts = [];
                }
            } else {
                accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            }

            tg.CloudStorage.getItem('categories', (error, categoriesData) => {
                if (!error && categoriesData) {
                    try {
                        categories = JSON.parse(categoriesData);
                    } catch (parseError) {
                        categories = { expense: {}, income: {} };
                    }
                } else {
                    categories = JSON.parse(localStorage.getItem('categories') || '{"expense": {}, "income": {}}');
                }
                
                initializeDefaultAccounts();
                initializeDefaultCategories();
                isLoading = false;
                updateAllBalances();
                callback();
            });
        });
    }

    // Initialize default accounts
    function initializeDefaultAccounts() {
        if (accounts.length === 0) {
            accounts = [
                {
                    id: 'cash',
                    name: 'Наличные',
                    icon: '💵',
                    balance: 0
                },
                {
                    id: 'card',
                    name: 'Банковская карта', 
                    icon: '💳',
                    balance: 0
                }
            ];
            saveData();
        }
    }

    function saveData() {
        saveToCloud();
    }

    function checkWelcome() {
        const welcomeShown = localStorage.getItem('welcome_shown');
        if (welcomeShown) {
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
        }
    }

    // Category management functions
    window.addCategory = function() {
        const name = document.getElementById('new-category-name').value.trim();
        const type = document.getElementById('new-category-type').value;
        const icon = document.getElementById('new-category-icon').value.trim() || '📦';

        if (!name) {
            if (tg.showAlert) {
                tg.showAlert('Введите название категории');
            } else {
                alert('Введите название категории');
            }
            return;
        }

        const categoryId = 'custom_' + Date.now();
        categories[type][categoryId] = {
            name: `${icon} ${name}`,
            icon: icon,
            custom: true
        };

        document.getElementById('new-category-name').value = '';
        document.getElementById('new-category-icon').value = '';

        saveData();
        updateCategories();
        displayCategories();
        updateFilters();

        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }

    function displayCategories() {
        const categoryList = document.getElementById('category-list');
        if (!categoryList) return;

        const allCategories = [
            ...Object.entries(categories.expense).map(([id, cat]) => ({ id, ...cat, type: 'expense' })),
            ...Object.entries(categories.income).map(([id, cat]) => ({ id, ...cat, type: 'income' }))
        ];

        categoryList.innerHTML = allCategories.map(category => `
            <div class="category-row">
                <input type="text" class="category-input" value="${category.name}" 
                       onchange="updateCategory('${category.id}', '${category.type}', this.value)"
                       ${category.custom ? '' : 'readonly'}>
                <div class="category-type ${category.type}">${category.type === 'income' ? 'Доход' : 'Расход'}</div>
                ${category.custom ? 
                    `<button class="category-action-btn delete" onclick="deleteCategory('${category.id}', '${category.type}')">🗑️</button>` :
                    '<span style="width: 32px;"></span>'
                }
            </div>
        `).join('');
    }

    window.updateCategory = function(categoryId, type, newName) {
        if (categories[type][categoryId] && categories[type][categoryId].custom) {
            categories[type][categoryId].name = newName;
            saveData();
            updateCategories();
        }
    }

    window.
