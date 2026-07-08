const currentYear = new Date().getFullYear();
export const years = Array.from({ length: currentYear - 1959 }, (_, i) => currentYear - i);