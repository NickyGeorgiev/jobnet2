export function validatePassword(password) {
  const errors = []
  if (password.length < 8) errors.push('поне 8 символа')
  if (!/[a-z]/.test(password)) errors.push('малка буква')
  if (!/[A-Z]/.test(password)) errors.push('главна буква')
  if (!/[0-9]/.test(password)) errors.push('цифра')
  if (!/[^a-zA-Z0-9]/.test(password)) errors.push('специален символ (напр. ! @ # $)')
  return errors
}