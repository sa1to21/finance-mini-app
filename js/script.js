document.addEventListener("DOMContentLoaded", () => {
    // Инициализация Telegram WebApp
    let tg = window.Telegram?.WebApp || {
        expand: () => {},
        ready: () => {},
        HapticFeedback: null,
        showAlert: null,
        showConfirm: null,
        CloudStorage: null,
        colorScheme: 'dark'
    };
    
    // ВАЖНО: Принудительно раскрываем приложение
    tg.expand();
    tg.ready();
    
    // Дополнительная попытка раскрыть через некоторое время
    setTimeout(() => {
        if (tg.expand) {
            tg.expand();
        }
    }, 100);
    
    // Принудительно устанавливаем высоту для body
    function setFullHeight() {
        const vh = window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        document.body.style.minHeight = `${vh}px`;
        document.body.style.height = `${vh}px`;
    }
    
    // Устанавливаем высоту сразу и при изменении размера
    setFullHeight();
    window.addEventListener('resize', setFullHeight);

    // Данные приложения
    let transactions = [];
    let accounts = [];
    let isLoading = false;
    let editingTransactionId = null;
    let editingAccountId = null;

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
        'freelance': '💻 Фрилан',
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
            if (tg.CloudStorage) {
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
            }
        } catch (error) {
            console.error('Ошибка сохранения в Cloud:', error);
        }
        
        // Всегда сохраняем в localStorage как fallback
        localStorage.setItem('transactions', JSON.stringify(transactions));
        localStorage.setItem('accounts', JSON.stringify(accounts));
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
                                
                                // Загружаем счета
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
            initializeDefaultAccounts();
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
        saveToCloud();
    }

    // Велком экран
    window.startApp = function() {
        document.getElementById('welcome-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // Сохраняем флаг что велком показали
        localStorage.setItem('welcome_shown', 'true');
        
        // Еще раз пытаемся раскрыть после показа основного интерфейса
        setTimeout(() => {
            if (tg.expand) {
                tg.expand();
            }
        }, 200);
        
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
            
            // Очищаем существующие опции
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

    // Обновление категорий для редактирования
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
            
            // Очищаем существующие опции
            categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
            const categories = type === 'expense' ? expenseCategories : incomeCategories;
            
            Object.entries(categories).forEach(([value, label]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                categorySelect.appendChild(option);
            });
        }
        
        updateEditAccountSelect();
    }

    // Обновление фильтра периода
    window.updatePeriodFilter = function() {
        const periodFilter = document.getElementById('period-filter');
        const customDateRange = document.getElementById('custom-date-range');
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        
        if (periodFilter.value === 'custom') {
            customDateRange.classList.remove('hidden');
            // Устанавливаем текущую дату по умолчанию
            if (!startDate.value) {
                const today = new Date().toISOString().split('T')[0];
                endDate.value = today;
                // Начальная дата - месяц назад
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                startDate.value = monthAgo.toISOString().split('T')[0];
            }
        } else {
            customDateRange.classList.add('hidden');
        }
        
        applyFilters();
    }

    // Обновление списков счетов
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

    // Переключение табов
    window.showTab = function(tabName) {
        // Скрываем все табы
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Убираем активный класс со всех навигационных элементов
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
        });
        
        // Показываем нужный таб
        const targetTab = document.getElementById(tabName + '-tab');
        if (targetTab) {
            targetTab.classList.remove('hidden');
        }
        
        // Добавляем активный класс к нажатому элементу навигации
        const activeNavItem = document.querySelector(`[onclick="showTab('${tabName}')"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        // Обновляем содержимое в зависимости от таба
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

    // Редактирование транзакции
    window.editTransaction = function(id) {
        const transaction = transactions.find(t => t.id === id);
        if (!transaction) return;

        editingTransactionId = id;

        // Заполняем форму редактирования
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

        // Возвращаем старые изменения в балансах
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

        // Обновляем транзакцию
        if (type === 'transfer') {
            const fromAccountId = document.getElementById('edit-from-account').value;
            const toAccountId = document.getElementById('edit-to-account').value;
            
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

            transaction.type = 'transfer';
            transaction.amount = amount;
            transaction.fromAccount = fromAccountId;
            transaction.toAccount = toAccountId;
            transaction.description = description || `Перевод ${fromAccount.name} → ${toAccount.name}`;
            delete transaction.category;
            delete transaction.account;

            // Применяем новые изменения
            fromAccount.balance -= amount;
            toAccount.balance += amount;
        } else {
            const category = document.getElementById('edit-category').value;
            const accountId = document.getElementById('edit-account').value;
            
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

            transaction.type = type;
            transaction.amount = amount;
            transaction.category = category;
            transaction.account = accountId;
            transaction.description = description;
            delete transaction.fromAccount;
            delete transaction.toAccount;

            // Применяем новые изменения
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
        showSyncStatus();

        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }

        if (tg.showAlert) {
            tg.showAlert('Операция обновлена!');
        }
    }

    // Редактирование счета
    window.editAccount = function(accountId) {
        const account = accounts.find(a => a.id === accountId);
        if (!account) return;

        editingAccountId = accountId;

        // Заполняем форму редактирования
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

        // Обновляем данные счета
        account.name = newName;
        account.icon = newIcon;
        account.balance += balanceCorrection;

        // Если была корректировка баланса, создаем транзакцию
        if (balanceCorrection !== 0) {
            const transaction = {
                id: Date.now(),
                type: balanceCorrection > 0 ? 'income' : 'expense',
                amount: Math.abs(balanceCorrection),
                category: balanceCorrection > 0 ? 'other-income' : 'other-expense',
                account: editingAccountId,
                description: `Корректировка баланса счёта "${newName}" (было: ${oldName})`,
                date: new Date().toISOString()
            };
            transactions.unshift(transaction);
        }

        // Если изменилось название или иконка, создаем запись об изменении
        if (oldName !== newName || oldIcon !== newIcon) {
            const transaction = {
                id: Date.now() + 1, // +1 чтобы избежать дублирования ID
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
        showSyncStatus();

        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }

        if (tg.showAlert) {
            tg.showAlert('Счёт обновлен!');
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
        if (balanceElement) {
            balanceElement.textContent = formatCurrency(totalBalance);
            
            balanceElement.className = 'total-balance';
            if (totalBalance > 0) {
                balanceElement.classList.add('positive');
            } else if (totalBalance < 0) {
                balanceElement.classList.add('negative');
            }
        }

        // Краткая информация по счетам
        const accountsSummary = document.getElementById('accounts-summary');
        if (accountsSummary) {
            accountsSummary.innerHTML = accounts.map(account => 
                `<div class="account-chip">${account.icon} ${formatCurrency(account.balance)}</div>`
            ).join('');
        }
    }

    // Обновление фильтров
    function updateFilters() {
        // Обновляем фильтр категорий
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="all">Все категории</option>';
            
            const usedCategories = [...new Set(transactions.filter(t => t.category).map(t => t.category))];
            usedCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = allCategories[category] || category;
                categoryFilter.appendChild(option);
            });
        }

        // Обновляем фильтр счетов
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

    // Применение фильтров
    window.applyFilters = function() {
        const periodFilter = document.getElementById('period-filter');
        const categoryFilter = document.getElementById('category-filter');
        const typeFilter = document.getElementById('type-filter');
        const accountFilter = document.getElementById('account-filter');

        if (!periodFilter || !categoryFilter || !typeFilter || !accountFilter) {
            return;
        }

        let filteredTransactions = [...transactions];

        // Фильтр по периоду
        if (periodFilter.value !== 'all') {
            const now = new Date();
            let startDate, endDate;
            
            if (periodFilter.value === 'custom') {
                const startInput = document.getElementById('start-date');
                const endInput = document.getElementById('end-date');
                
                if (startInput.value && endInput.value) {
                    startDate = new Date(startInput.value);
                    endDate = new Date(endInput.value);
                    endDate.setHours(23, 59, 59, 999); // Включаем весь день
                }
            } else {
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
            }
            
            if (startDate && endDate) {
                filteredTransactions = filteredTransactions.filter(t => {
                    const transactionDate = new Date(t.date);
                    return transactionDate >= startDate && transactionDate <= endDate;
                });
            }
        }

        // Остальные фильтры
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

    // Отображение отфильтрованных транзакций
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
                categoryName = allCategories[transaction.category] || transaction.category;
                const account = accounts.find(a => a.id === transaction.account);
                accountInfo = `<div class="transaction-account">${account?.icon} ${account?.name}</div>`;
            }
            
            let amountDisplay = '';
            let actionsHtml = '';
            
            if (transaction.type === 'account-edit') {
                amountDisplay = '';
                actionsHtml = ''; // Не показываем кнопки редактирования для служебных записей
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

    // Очистка фильтров
    window.clearFilters = function() {
        const periodFilter = document.getElementById('period-filter');
        const categoryFilter = document.getElementById('category-filter');
        const typeFilter = document.getElementById('type-filter');
        const accountFilter = document.getElementById('account-filter');
        const customDateRange = document.getElementById('custom-date-range');

        if (periodFilter) periodFilter.value = 'all';
        if (categoryFilter) categoryFilter.value = 'all';
        if (typeFilter) typeFilter.value = 'all';
        if (accountFilter) accountFilter.value = 'all';
        if (customDateRange) customDateRange.classList.add('hidden');
        
        applyFilters();
    }

    // Удаление транзакции
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
        
        // Возвращаем изменения в балансах (только для реальных операций)
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
        showSyncStatus();
        
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
    }

    // Отображение счетов
    function displayAccounts() {
        const accountsGrid = document.getElementById('accounts-grid');
        if (!accountsGrid) return;
        
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
                <div class="account-actions">
                    <button class="account-edit-btn" onclick="editAccount('${account.id}')">Редактировать</button>
                    <button class="account-delete-btn" onclick="deleteAccount('${account.id}')">Удалить</button>
                </div>
            </div>
        `).join('');

        accountsGrid.innerHTML = accountsHTML;
    }

    // Добавление нового счёта
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

    // Отображение статистики
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

        const expenseBreakdown = document.getElementById('expense-breakdown');
        if (expenseBreakdown) {
            expenseBreakdown.innerHTML = 
                expenseHTML || '<div class="empty-state">Расходов пока нет</div>';
        }

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

        const incomeBreakdown = document.getElementById('income-breakdown');
        if (incomeBreakdown) {
            incomeBreakdown.innerHTML = 
                incomeHTML || '<div class="empty-state">Доходов пока нет</div>';
        }

        // Статистика по счетам
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

    // Показать статус синхронизации
    function showSyncStatus() {
        const status = document.getElementById('sync-status');
        if (status) {
            status.classList.add('show');
            setTimeout(() => {
                status.classList.remove('show');
            }, 1500);
        }
    }

    // Форматирование валюты
    function formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
    }

    // Добавляем обработчики для фильтров
    function setupFilterHandlers() {
        const filterElements = [
            'period-filter', 'category-filter', 'type-filter', 'account-filter',
            'start-date', 'end-date'
        ];
        
        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', applyFilters);
            }
        });

        // Специальный обработчик для фильтра периода
        const periodFilter = document.getElementById('period-filter');
        if (periodFilter) {
            periodFilter.addEventListener('change', updatePeriodFilter);
        }
    }

    // Инициализация приложения
    async function init() {
        try {
            // Проверяем нужно ли показывать велком
            checkWelcome();
            
            // Показываем индикатор загрузки
            const balanceElement = document.getElementById('total-balance');
            if (balanceElement) {
                balanceElement.textContent = 'Загрузка...';
            }
            
            // Загружаем данные из облака
            await loadFromCloud();
            
            // Обновляем интерфейс
            updateAllBalances();
            updateCategories();
            setupFilterHandlers();
            
            // Настройка цветовой темы
            document.documentElement.style.setProperty('--tg-color-scheme', tg.colorScheme);
            
            console.log('Приложение инициализировано');
        } catch (error) {
            console.error('Ошибка инициализации:', error);
        }
    }

    // Запуск приложения
    init();
});
