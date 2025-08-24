import { initStorage } from './storage.js';
import { updateAllBalances } from './transactions.js';
import { initUI } from './ui.js';


async function init() {
await initStorage();
updateAllBalances();
initUI();
console.log("Приложение инициализировано");
}


init();
