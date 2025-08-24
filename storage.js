js
export let transactions = [];
export let accounts = [];


let tg = window.Telegram.WebApp;


export function saveData() {
localStorage.setItem('transactions', JSON.stringify(transactions));
localStorage.setItem('accounts', JSON.stringify(accounts));
saveToCloud();
}


function saveToCloud() { /* вынесенная логика */ }
export async function initStorage() { /* loadFromCloud + initializeDefaultAccounts */ }
