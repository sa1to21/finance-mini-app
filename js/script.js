<script>
        // Инициализация Telegram WebApp
        let tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();

        // Данные приложения
        let transactions = [];
        let accounts = [];
        let isLoading = false;

        // Категории с эмодзи
        const expenseCategories = {
            'food': '🍕 Еда',
            'transport': '🚗 Транспорт', 
            'shopping': '🛒 Покупки',
            'entertainment': '🎬 Развлечения',
            'health': '💊 Здоровье',
            'bills': '📄 Счета',
            'education': '📚 Образование',
            'sport': '⚽ Спорт',
            'beauty': '💄 Красота',
            'home': '🏠 Дом',
            'other-expense': '📦 Прочее'
        };

        const incomeCategories = {
            'salary': '💰 Зарплата',
            'freelance': '💻 Фрилансе',
            'business': '🏢 Бизнес',
            'investment': '📈 Инвестиции',
            'gift': '🎁 Подарок',
            'bonus': '🎯 Премия',
            'sale': '💸 Продажа',
            'refund': '↩️ Возврат',
            'other-income': '💵 Прочее'
        };

        const allCategories = {...expenseCategories, ...incomeCategories};

        // Telegram Cloud Storage функции
        function saveToCloud() {
            if (isLoading) return;
            
            try {
                // Сохраняем транзакции
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

                // Сохраняем счета
                const accountsData = JSON.stringify(accounts);
                tg.CloudStorage.setItem('accounts', accountsData);
                
                console.log('Данные сохранены в Telegram Cloud');
            } catch (error) {
                console.error('Ошибка сохранения в Cloud:', error);
                // Fallback на localStorage
                localStorage.setItem('transactions', JSON.stringify(transactions));
                localStorage.setItem('accounts', JSON.stringify(accounts));
            }
        }

        function loadFromCloud() {
            return new Promise((resolve) => {
                if (!tg.CloudStorage) {
                    // Fallback на localStorage
                    const localTransactions = localStorage.getItem('transactions');
                    const localAccounts = localStorage.getItem('accounts');
                    transactions = JSON.parse(localTransactions || '[]');
                    accounts = JSON.parse(localAccounts || '[]');
                    initializeDefaultAccounts();
                    resolve();
                    return;
                }

                isLoading = true;
                
                // Загружаем транзакции
                tg.CloudStorage.getItem('transactions_chunks_count', (error, chunksCount) => {
                    if (error || !chunksCount) {
                        transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
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
                                    
                                    // Загружаем счета
                                    loadAccountsFromCloud(resolve);
                                }
                            });
                        }
                    }
                    
                    if (!chunksCount) {
                        loadAccountsFromCloud(resolve);
                    }
                });
            });
        }

        function loadAccountsFromCloud(callback) {
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
                
                initializeDefaultAccounts();
                isLoading = false;
                updateAllBalances();
                callback();
            });
        }

        // Инициализация счетов по умолчанию
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

        // Сохранение данных
        function saveData() {
            localStorage.setItem('transactions', JSON.stringify(transactions));
            localStorage.setItem('accounts', JSON.stringify(accounts));
            saveToCloud();
        }

        // Велком экран
        function startApp() {
            document.getElementById('welcome-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            
            // Сохраняем флаг что велком показали
            localStorage.setItem('welcome_shown', 'true');
            
            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('medium');
            }
        }

        // Проверка нужно ли показывать велком
        function checkWelcome() {
            const welcomeShown = localStorage.getItem('welcome_shown');
            if (welcomeShown) {
                document.getElementById('welcome-screen').style.display = 'none';
                document.getElementById('main-app').style.display = 'block';
            }
        }

        // Обновление категорий в зависимости от типа операции
        function updateCategories() {
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
                const categories = type === 'expense' ? expenseCategories : incomeCategories;
                
                Object.entries(categories).forEach(([value, label]) => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = label;
                    categorySelect.appendChild(option);
                });
            }
            
            updateAccountSelect();
        }

        // Обновление списков счетов
        function updateAccountSelect() {
            const accountSelect = document.getElementById('account');
            accountSelect.innerHTML = '<option value="">Выберите счёт</option>';
            
            accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.icon} ${account.name}`;
                accountSelect.appendChild(option);
            });
        }

        function updateAccountSelects() {
            const fromSelect = document.getElementById('from-account');
            const toSelect = document.getElementById('to-account');
            
            [fromSelect, toSelect].forEach(select => {
                select.innerHTML = '';
                accounts.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = `${account.icon} ${account.name}`;
                    select.appendChild(option);
                });
            });
        }

        // Переключение табов
        function showTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.add('hidden');
            });
            
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            
            document.getElementById(tabName + '-tab').classList.remove('hidden');
            event.target.closest('.nav-item').classList.add('active');
            
            if (tabName === 'history') {
                updateFilters();
                applyFilters();
            } else if (tabName === 'stats') {
                displayStats();
            } else if (tabName === 'accounts') {
                displayAccounts();
            }

            if (tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
        }

        // Добавление транзакции
        function addTransaction() {
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
                
                // Обновляем балансы счетов
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

                // Обновляем баланс счёта
                if (type === 'income') {
                    account.balance += amount;
                } else {
                    account.balance -= amount;
                }
            }

            saveData();
            updateAllBalances();
            clearForm();
            showSyncStatus();

            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }

            if (tg.showAlert) {
                tg.showAlert('Операция добавлена!');
            }
        }

        // Очистка формы
        function clearForm() {
            document.getElementById('amount').value = '';
            document.getElementById('description').value = '';
        }

        // Обновление всех балансов
        function updateAllBalances() {
            // Общий баланс
            const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
            const balanceElement = document.getElementById('total-balance');
            balanceElement.textContent = formatCurrency(totalBalance);
            
            balanceElement.className = 'total-balance';
            if (totalBalance > 0) {
                balanceElement.classList.add('positive');
            } else if (totalBalance < 0) {
                balanceElement.classList.add('negative');
            }

            // Краткая информация по счетам
            const accountsSummary = document.getElementById('accounts-summary');
            accountsSummary.innerHTML = accounts.map(account => 
                `<div class="account-chip">${account.icon} ${formatCurrency(account.balance)}</div>`
            ).join('');
        }

        // Обновление фильтров
        function updateFilters() {
            // Обновляем фильтр категорий
            const categoryFilter = document.getElementById('category-filter');
            categoryFilter.innerHTML = '<option value="all">Все категории</option>';
            
            const usedCategories = [...new Set(transactions.filter(t => t.category).map(t => t.category))];
            usedCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = allCategories[category] || category;
                categoryFilter.appendChild(option);
            });

            // Обновляем фильтр счетов
            const accountFilter = document.getElementById('account-filter');
            accountFilter.innerHTML = '<option value="all">Все счета</option>';
            
            accounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.icon} ${account.name}`;
                accountFilter.appendChild(option);
            });
        }

        // Применение фильтров
        function applyFilters() {
            const periodFilter = document.getElementById('period-filter').value;
            const categoryFilter = document.getElementById('category-filter').value;
            const typeFilter = document.getElementById('type-filter').value;
            const accountFilter = document.getElementById('account-filter').value;

            let filteredTransactions = [...transactions];

            // Фильтр по периоду
            if (periodFilter !== 'all') {
                const now = new Date();
                let startDate = new Date();
                
                switch (periodFilter) {
                    case 'today':
                        startDate.setHours(0, 0, 0, 0);
                        break;
                    case 'week':
                        startDate.setDate(now.getDate() - 7);
                        break;
                    case 'month':
                        startDate.setMonth(now.getMonth() - 1);
                        break;
                    case 'quarter':
                        startDate.setMonth(now.getMonth() - 3);
                        break;
                }
                
                filteredTransactions = filteredTransactions.filter(t => 
                    new Date(t.date) >= startDate
                );
            }

            // Остальные фильтры
            if (categoryFilter !== 'all') {
                filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilter);
            }
            
            if (typeFilter !== 'all') {
                filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
            }
            
            if (accountFilter !== 'all') {
                filteredTransactions = filteredTransactions.filter(t => 
                    t.account === accountFilter || t.fromAccount === accountFilter || t.toAccount === accountFilter
                );
            }

            displayFilteredTransactions(filteredTransactions);
        }

        // Отображение отфильтрованных транзакций
        function displayFilteredTransactions(filteredTransactions) {
            const listElement = document.getElementById('transaction-list');
            
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
                } else {
                    categoryName = allCategories[transaction.category] || transaction.category;
                    const account = accounts.find(a => a.id === transaction.account);
                    accountInfo = `<div class="transaction-account">${account?.icon} ${account?.name}</div>`;
                }
                
                return `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <div class="transaction-category">${categoryName}</div>
                            <div class="transaction-date">${date}</div>
                            ${accountInfo}
                            ${transaction.description ? `<div style="font-size: 12px; color: var(--tg-theme-hint-color, #999);">${transaction.description}</div>` : ''}
                        </div>
                        <div class="transaction-amount ${transaction.type}">
                            ${transaction.type === 'income' ? '+' : (transaction.type === 'transfer' ? '' : '-')}${formatCurrency(transaction.amount)}
                        </div>
                        <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">🗑️</button>
                    </div>
                `;
            }).join('');

            listElement.innerHTML = transactionsHTML;
        }

        // Очистка фильтров
        function clearFilters() {
            document.getElementById('period-filter').value = 'all';
            document.getElementById('category-filter').value = 'all';
            document.getElementById('type-filter').value = 'all';
            document.getElementById('account-filter').value = 'all';
            applyFilters();
        }

        // Удаление транзакции
        function deleteTransaction(id) {
            if (tg.showConfirm) {
                tg.showConfirm('Удалить операцию?', (confirmed) => {
                    if (confirmed) {
                        const transaction = transactions.find(t => t.id === id);
                        
                        // Возвращаем изменения в балансах
                        if (transaction.type === 'transfer') {
                            const fromAccount = accounts.find(a => a.id === transaction.fromAccount);
                            const toAccount = accounts.find(a => a.id === transaction.toAccount);
                            fromAccount.balance += transaction.amount;
                            toAccount.balance -= transaction.amount;
                        } else {
                            const account = accounts.find(a => a.id === transaction.account);
                            if (transaction.type === 'income') {
                                account.balance -= transaction.amount;
                            } else {
                                account.balance += transaction.amount;
                            }
                        }

                        transactions = transactions.filter(t => t.id !== id);
                        saveData();
                        updateAllBalances();
                        applyFilters();
                        showSyncStatus();
                        
                        if (tg.HapticFeedback) {
                            tg.HapticFeedback.notificationOccurred('success');
                        }
                    }
                });
            } else {
                if (confirm('Удалить операцию?')) {
                    const transaction = transactions.find(t => t.id === id);
                    
                    if (transaction.type === 'transfer') {
                        const fromAccount = accounts.find(a => a.id === transaction.fromAccount);
                        const toAccount = accounts.find(a => a.id === transaction.toAccount);
                        fromAccount.balance += transaction.amount;
                        toAccount.balance -= transaction.amount;
                    } else {
                        const account = accounts.find(a => a.id === transaction.account);
                        if (transaction.type === 'income') {
                            account.balance -= transaction.amount;
                        } else {
                            account.balance += transaction.amount;
                        }
                    }

                    transactions = transactions.filter(t => t.id !== id);
                    saveData();
                    updateAllBalances();
                    applyFilters();
                    showSyncStatus();
                }
            }
        }

        // Отображение счетов
        function displayAccounts() {
            const accountsGrid = document.getElementById('accounts-grid');
            
            const accountsHTML = accounts.map(account => `
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
                    ${account.id !== 'cash' && account.id !== 'card' ? 
                        `<button class="btn danger" style="margin-top: 12px;" onclick="deleteAccount('${account.id}')">Удалить счёт</button>` : 
                        ''
                    }
                </div>
            `).join('');

            accountsGrid.innerHTML = accountsHTML;
        }

        // Добавление нового счёта
        function addAccount() {
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
            
            // Если добавляем счёт с начальным балансом, создаём соответствующую транзакцию
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
            showSyncStatus();

            // Очищаем форму
            document.getElementById('new-account-name').value = '';
            document.getElementById('new-account-balance').value = '';

            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }

            if (tg.showAlert) {
                tg.showAlert('Счёт добавлен!');
            }
        }

        // Удаление счёта
        function deleteAccount(accountId) {
            const account = accounts.find(a => a.id === accountId);
            
            if (tg.showConfirm) {
                tg.showConfirm(`Удалить счёт "${account.name}"? Все связанные операции также будут удалены.`, (confirmed) => {
                    if (confirmed) {
                        // Удаляем все транзакции связанные со счётом
                        transactions = transactions.filter(t => 
                            t.account !== accountId && 
                            t.fromAccount !== accountId && 
                            t.toAccount !== accountId
                        );
                        
                        // Удаляем счёт
                        accounts = accounts.filter(a => a.id !== accountId);
                        
                        saveData();
                        updateAllBalances();
                        displayAccounts();
                        updateAccountSelect();
                        showSyncStatus();
                        
                        if (tg.HapticFeedback) {
                            tg.HapticFeedback.notificationOccurred('success');
                        }
                    }
                });
            } else {
                if (confirm(`Удалить счёт "${account.name}"? Все связанные операции также будут удалены.`)) {
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
                    showSyncStatus();
                }
            }
        }

        // Отображение статистики
        function displayStats() {
            const income = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
                
            const expenses = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            document.getElementById('total-income').textContent = formatCurrency(income);
            document.getElementById('total-expenses').textContent = formatCurrency(expenses);

            // Статистика по категориям расходов
            const expensesByCategory = {};
            transactions
                .filter(t => t.type === 'expense')
                .forEach(t => {
                    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
                });

            const expenseHTML = Object.entries(expensesByCategory)
                .sort(([,a], [,b]) => b - a)
                .map(([category, amount]) => `
                    <div class="category-item">
                        <span>${allCategories[category] || category}</span>
                        <span>${formatCurrency(amount)}</span>
                    </div>
                `).join('');

            document.getElementById('expense-breakdown').innerHTML = 
                expenseHTML || '<div class="empty-state">Расходов пока нет</div>';

            // Статистика по категориям доходов
            const incomesByCategory = {};
            transactions
                .filter(t => t.type === 'income')
                .forEach(t => {
                    incomesByCategory[t.category] = (incomesByCategory[t.category] || 0) + t.amount;
                });

            const incomeHTML = Object.entries(incomesByCategory)
                .sort(([,a], [,b]) => b - a)
                .map(([category, amount]) => `
                    <div class="category-item">
                        <span>${allCategories[category] || category}</span>
                        <span style="color: #4CAF50;">${formatCurrency(amount)}</span>
                    </div>
                `).join('');

            document.getElementById('income-breakdown').innerHTML = 
                incomeHTML || '<div class="empty-state">Доходов пока нет</div>';

            // Статистика по счетам
            const accountsHTML = accounts.map(account => `
                <div class="category-item">
                    <span>${account.icon} ${account.name}</span>
                    <span style="color: ${account.balance >= 0 ? '#4CAF50' : '#f44336'};">${formatCurrency(account.balance)}</span>
                </div>
            `).join('');

            document.getElementById('accounts-breakdown').innerHTML = accountsHTML;
        }

        // Показать статус синхронизации
        function showSyncStatus() {
            const status = document.getElementById('sync-status');
            status.classList.add('show');
            setTimeout(() => {
                status.classList.remove('show');
            }, 2000);
        }

        // Форматирование валюты
        function formatCurrency(amount) {
            return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
        }

        // Добавляем обработчики для фильтров
        document.addEventListener('DOMContentLoaded', function() {
            const filterElements = [
                'period-filter', 'category-filter', 'type-filter', 'account-filter'
            ];
            
            filterElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', applyFilters);
                }
            });
        });

        // Инициализация приложения
        async function init() {
            // Проверяем нужно ли показывать велком
            checkWelcome();
            
            // Показываем индикатор загрузки
            if (document.getElementById('total-balance')) {
                document.getElementById('total-balance').textContent = 'Загрузка...';
            }
            
            // Загружаем данные из облака
            await loadFromCloud();
            
            // Обновляем интерфейс
            updateAllBalances();
            updateCategories();
            
            // Настройка цветовой темы
            document.documentElement.style.setProperty('--tg-color-scheme', tg.colorScheme);
            
            console.log('Приложение инициализировано');
        }

        // Запуск приложения
        init();
    </script>
