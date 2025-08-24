import { addTransaction, updateFilters, applyFilters } from './transactions.js';
import { displayAccounts } from './accounts.js';
import { displayStats } from './stats.js';


let tg = window.Telegram.WebApp;


export function initUI() {
document.addEventListener('DOMContentLoaded', () => {
const filterElements = ['period-filter', 'category-filter', 'type-filter', 'account-filter'];
filterElements.forEach(id => {
const element = document.getElementById(id);
if (element) element.addEventListener('change', applyFilters);
});
});
}


export function showTab(tabName) { /* переключение вкладок */ }
export function startApp() { /* скрыть welcome */ }
export function checkWelcome() { /* проверка welcome */ }
export function showSyncStatus() { /* индикатор */ }
