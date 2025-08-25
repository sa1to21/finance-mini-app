// Essential function - must be available immediately
window.startApp = function() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    localStorage.setItem('welcome_shown', 'true');
    
    setTimeout(() => {
        if (window.Telegram?.WebApp?.expand) {
            window.Telegram.WebApp.expand();
        }
    }, 200);
    
    console.log('App started successfully');
};

// Global variables
let tg = window.Telegram?.WebApp || {
    expand: () => {},
    ready: () => {},
    HapticFeedback: null,
    showAlert: null,
    showConfirm: null,
    CloudStorage: null,
    colorScheme: 'dark'
};

let transactions = [];
let accounts = [];
let categories = {
    expense: {},
    income: {}
};

// Calendar variables
let currentCalendarDate = new Date();
let dateMode = 'single';
let selectedDate = null;
let selectedRange = { start: null, end: null };

// Icon selection variables
let selectedIcon = '📦';
let isIconGridVisible = false;

// Available icons
const availableIcons = [
    '🍕', '🍔', '🚗', '🚕', '🛒', '🛍️', '🎬', '🎭', '💊', '🏥', 
    '📚', '📖', '⚽', '🏀', '💄', '💅', '🏠', '🏡', '📄', '🧾',
    '💰', '💵', '💳', '💎', '🎁', '🎯', '📦', '🏷️', '⭐', '❤️'
];

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

// Initialize Telegram WebApp
tg.expand();
tg.ready();

// Set full height
function setFullHeight() {
    const vh = window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setFullHeight();
window.addEventListener('resize', setFullHeight);

// Essential global functions
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
    
    if (tabName === 'categories') {
        displayCategories();
    } else if (tabName === 'accounts') {
        displayAccounts();
    } else if (tabName === 'stats') {
        displayStats();
    } else if (tabName === 'history') {
        displayTransactions();
    }
};

window.toggleIconSelection = function() {
    const container = document.getElementById('icon-grid-container');
    if (!container) return;
    
    if (isIconGridVisible) {
        container.classList.add('hidden');
        isIconGridVisible = false;
    } else {
        container.classList.remove('hidden');
        renderIconGrid();
        isIconGridVisible = true;
    }
};

window.selectIcon = function(icon) {
    selectedIcon = icon;
    const display = document.getElementById('selected-icon-display');
    if (display) {
        display.textContent = icon;
    }
    
    document.querySelectorAll('.icon-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    const selectedElement = document.querySelector(`[onclick="selectIcon('${icon}')"]`);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }
};

window.setDateMode = function(mode) {
    dateMode = mode;
    document.querySelectorAll('.date-mode-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`[onclick="setDateMode('${mode}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    selectedDate = null;
    selectedRange = { start: null, end: null };
    renderCalendar();
};

window.changeMonth = function(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
};

window.updatePeriodFilter = function() {
    const periodFilter = document.getElementById('period-filter');
    const calendarDateRange = document.getElementById('calendar-date-range');
    
    if (periodFilter && calendarDateRange) {
        if (periodFilter.value === 'calendar') {
            calendarDateRange.classList.remove('hidden');
            renderCalendar();
        } else {
            calendarDateRange.classList.add('hidden');
        }
    }
};

window.addTransaction = function() {
    const type = document.getElementById('type')?.value;
    const amount = parseFloat(document.getElementById('amount')?.value);
    const description = document.getElementById('description')?.value || '';

    if (!amount || amount <= 0) {
        alert('Введите корректную сумму');
        return;
    }

    if (type === 'transfer') {
        const fromAccountId = document.getElementById('from-account')?.value;
        const toAccountId = document.getElementById('to-account')?.value;
        
        if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
            alert('Выберите разные счета для перевода');
            return;
        }

        const fromAccount = accounts.find(a => a.id === fromAccountId);
        const toAccount = accounts.find(a => a.id === toAccountId);

        if (!fromAccount || !toAccount) {
            alert('Счета не найдены');
            return;
        }

        if (fromAccount.balance < amount) {
            alert('Недостаточно средств на счёте');
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
        const category = document.getElementById('category')?.value;
        const accountId = document.getElementById('account')?.value;
        
        if (!category || !accountId) {
            alert('Выберите категорию и счёт');
            return;
        }
        
        const account = accounts.find(a => a.id === accountId);
        if (!account) {
            alert('Счёт не найден');
            return;
        }

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
    alert('Операция добавлена!');
};

window.addCategory = function() {
    const name = document.getElementById('new-category-name')?.value?.trim();
    const type = document.getElementById('new-category-type')?.value;

    if (!name) {
        alert('Введите название категории');
        return;
    }

    const categoryId = 'custom_' + Date.now();
    categories[type][categoryId] = {
        name: `${selectedIcon} ${name}`,
        icon: selectedIcon,
        custom: true
    };

    document.getElementById('new-category-name').value = '';
    selectedIcon = '📦';
    const display = document.getElementById('selected-icon-display');
    if (display) {
        display.textContent = selectedIcon;
    }
    
    const container = document.getElementById('icon-grid-container');
    if (container) {
        container.classList.add('hidden');
    }
    isIconGridVisible = false;

    saveData();
    updateCategories();
    displayCategories();
    alert('Категория добавлена!');
};

window.addAccount = function() {
    const name = document.getElementById('new-account-name')?.value?.trim();
    const icon = document.getElementById('new-account-icon')?.value || '💰';
    const balance = parseFloat(document.getElementById('new-account-balance')?.value) || 0;

    if (!name) {
        alert('Введите название счёта');
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
    displayAccounts();
    updateAccountSelects();

    document.getElementById('new-account-name').value = '';
    document.getElementById('new-account-balance').value = '';
    
    updateAllBalances();
    alert('Счёт добавлен!');
};

window.updateCategories = function() {
    const type = document.getElementById('type')?.value;
    const categoryGroup = document.getElementById('category-group');
    const fromAccountGroup = document.getElementById('from-account-group');
    const toAccountGroup = document.getElementById('to-account-group');
    const accountGroup = document.getElementById('account-group');
    const categorySelect = document.getElementById('category');
    
    if (!type || !categoryGroup || !categorySelect) return;
    
    if (type === 'transfer') {
        categoryGroup.classList.add('hidden');
        if (fromAccountGroup) fromAccountGroup.classList.remove('hidden');
        if (toAccountGroup) toAccountGroup.classList.remove('hidden');
        if (accountGroup) accountGroup.classList.add('hidden');
        updateAccountSelects();
    } else {
        categoryGroup.classList.remove('hidden');
        if (fromAccountGroup) fromAccountGroup.classList.add('hidden');
        if (toAccountGroup) toAccountGroup.classList.add('hidden');
        if (accountGroup) accountGroup.classList.remove('hidden');
        
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
};

// Stub functions for other features
window.editTransaction = function(id) { console.log('Edit transaction:', id); };
window.deleteTransaction = function(id) { console.log('Delete transaction:', id); };
window.editAccount = function(id) { console.log('Edit account:', id); };
window.deleteAccount = function(id) { console.log('Delete account:', id); };
window.closeEditModal = function() { console.log('Close edit modal'); };
window.closeEditAccountModal = function() { console.log('Close edit account modal'); };
window.saveEditTransaction = function() { console.log('Save edit transaction'); };
window.saveEditAccount = function() { console.log('Save edit account'); };
window.applyFilters = function() { console.log('Apply filters'); };
window.clearFilters = function() { console.log('Clear filters'); };
window.editCategoryInline = function(id, type) { console.log('Edit category:', id, type); };
window.deleteCategory = function(id, type) { console.log('Delete category:', id, type); };
window.saveCategoryEdit = function(id, type) { console.log('Save category edit:', id, type); };
window.cancelCategoryEdit = function() { console.log('Cancel category edit'); };

// Helper functions
function renderIconGrid() {
    const iconGrid = document.getElementById('icon-grid');
    if (!iconGrid) return;
    
    iconGrid.innerHTML = availableIcons.map(icon => 
        `<div class="icon-option ${icon === selectedIcon ? 'selected' : ''}" 
             onclick="selectIcon('${icon}')">${icon}</div>`
    ).join('');
}

function renderCalendar() {
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    const monthYearElement = document.getElementById('calendar-month-year');
    if (monthYearElement) {
        monthYearElement.textContent = 
            `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
    }
    
    const daysContainer = document.getElementById('calendar-days');
    if (!daysContainer) return;
    
    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    
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
    
    // Fill remaining cells
    const totalCells = daysContainer.children.length;
    const remainingCells = (42 - totalCells) % 7;
    if (remainingCells > 0) {
        const nextMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1);
        for (let day = 1; day <= remainingCells; day++) {
            const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day);
            const dayElement = createDayElement(day, 'other-month', date);
            daysContainer.appendChild(dayElement);
        }
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
            <div class="category-icon-display">${category.icon}</div>
            <input type="text" class="category-input" value="${category.name}" readonly>
            <div class="category-type ${category.type}">
                ${category.type === 'income' ? 'Доход' : 'Расход'}
            </div>
            <div class="category-actions">
                ${category.custom ? 
                    `<button class="category-action-btn edit" onclick="editCategoryInline('${category.id}', '${category.type}')" title="Редактировать">✏️</button>
                     <button class="category-action-btn delete" onclick="deleteCategory('${category.id}', '${category.type}')" title="Удалить">🗑️</button>` :
                    '<span style="width: 64px;"></span>'
                }
            </div>
        </div>
    `).join('');
}

function displayAccounts() {
    const accountsGrid = document.getElementById('accounts-grid');
    if (!accountsGrid) return;
    
    accountsGrid.innerHTML = accounts.map(account => `
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
}

function displayStats() {
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    
    if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(income);
    if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(expenses);
}

function displayTransactions() {
    const listElement = document.getElementById('transaction-list');
    if (!listElement || transactions.length === 0) {
        if (listElement) {
            listElement.innerHTML = '<div class="empty-state"><p>Операций пока нет</p></div>';
        }
        return;
    }

    listElement.innerHTML = transactions.map(transaction => {
        const date = new Date(transaction.date).toLocaleDateString('ru-RU');
        let categoryName = '';
        let accountInfo = '';

        if (transaction.type === 'transfer') {
            const fromAccount = accounts.find(a => a.id === transaction.fromAccount);
            const toAccount = accounts.find(a => a.id === transaction.toAccount);
            categoryName = `${fromAccount?.icon} → ${toAccount?.icon} Перевод`;
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
        
        const amountDisplay = `${transaction.type === 'income' ? '+' : (transaction.type === 'transfer' ? '' : '-')}${formatCurrency(transaction.amount)}`;
        
        return `
            <div class="transaction-item">
                <div class="transaction-info" onclick="editTransaction(${transaction.id})">
                    <div class="transaction-category">${categoryName}</div>
                    <div class="transaction-date">${date}</div>
                    ${accountInfo}
                    ${transaction.description ? `<div style="font-size: 12px; color: var(--tg-theme-hint-color, #999);">${transaction.description}</div>` : ''}
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${amountDisplay}
                </div>
                <div class="transaction-actions">
                    <button class="edit-btn" onclick="editTransaction(${transaction.id})" title="Редактировать">✏️</button>
                    <button class="delete-btn" onclick="deleteTransaction(${transaction.id})" title="Удалить">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function initializeDefaultCategories() {
    if (Object.keys(categories.expense).length === 0) {
        categories.expense = { ...defaultExpenseCategories };
    }
    if (Object.keys(categories.income).length === 0) {
        categories.income = { ...defaultIncomeCategories };
    }
}

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
    }
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

function clearForm() {
    const amountField = document.getElementById('amount');
    const descriptionField = document.getElementById('description');
    if (amountField) amountField.value = '';
    if (descriptionField) descriptionField.value = '';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
}

function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('accounts', JSON.stringify(accounts));
    localStorage.setItem('categories', JSON.stringify(categories));
}

function checkWelcome() {
    const welcomeShown = localStorage.getItem('welcome_shown');
    if (welcomeShown) {
        document.getElementById('welcome-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    try {
        checkWelcome();
        
        // Load data from localStorage
        const localTransactions = localStorage.getItem('transactions');
        const localAccounts = localStorage.getItem('accounts');
        const localCategories = localStorage.getItem('categories');
        
        transactions = JSON.parse(localTransactions || '[]');
        accounts = JSON.parse(localAccounts || '[]');
        categories = JSON.parse(localCategories || '{"expense": {}, "income": {}}');
        
        initializeDefaultAccounts();
        initializeDefaultCategories();
        
        // Initialize UI
        updateAllBalances();
        updateCategories();
        displayCategories();
        displayAccounts();
        displayStats();
        displayTransactions();
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
    }
});
