export type PasswordStrength = 'weak' | 'medium' | 'strong';

// Refleja UNICAMENTE lo que el backend realmente exige (verificado contra
// auth.schema.js: password.min(8), sin requisito de mayusculas, numeros
// ni simbolos) -- es un indicador informativo para el usuario, nunca
// bloquea el submit. El unico gate real sigue siendo el minimo de 8
// caracteres, validado por separado en RegistroPage.tsx.
export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const typesCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (password.length >= 12 && typesCount >= 2) return 'strong';
  return 'medium';
}
