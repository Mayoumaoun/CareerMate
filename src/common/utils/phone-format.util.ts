export function formatPhone(phone?: string): string {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  
  if (digits.startsWith('216') && digits.length === 11) {
    const local = digits.slice(3);
    return '+216 ' + local.replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3');
  }


  if (digits.startsWith('33') && digits.length === 11) {
    const local = digits.slice(2);
    return (
      '+33 ' +
      local.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
    );
  }

  
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.replace(
      /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
      '$1 $2 $3 $4 $5',
    );
  }


  if (digits.length === 8) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3');
  }

  return phone;
}
