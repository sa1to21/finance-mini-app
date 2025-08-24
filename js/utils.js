js
export function formatCurrency(amount) {
return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
}
