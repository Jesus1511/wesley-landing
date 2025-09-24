// Validación de email con regex
export const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

// Validación de número de teléfono italiano/internacional
export const validatePhone = (phone) => {
  // Remover espacios, guiones y paréntesis
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  // Regex para números italianos e internacionales
  // Acepta: +39 123 456 7890, 123 456 7890, +1 123 456 7890, etc.
  const phoneRegex = /^(\+\d{1,3})?[\d\s\-\(\)]{8,15}$/
  
  // También verificar que tenga al menos 8 dígitos después de limpiar
  const digitCount = cleanPhone.replace(/\D/g, '').length
  
  return phoneRegex.test(phone) && digitCount >= 8 && digitCount <= 15
}

// Función para validar ambos campos
export const validateContactForm = (email, phone) => {
  const errors = {}
  
  if (!validateEmail(email)) {
    errors.email = 'Inserisci un indirizzo email valido'
  }
  
  if (!validatePhone(phone)) {
    errors.phone = 'Inserisci un numero di telefono valido (almeno 8 cifre)'
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
