// utils/helpers.js
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
};

const extractEmailAddress = (emailString) => {
  const match = emailString.match(/<(.+?)>/) || emailString.match(/(\S+@\S+)/);
  return match ? match[1] : emailString;
};

const sanitizeInput = (input) => {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

module.exports = {
  formatDate,
  extractEmailAddress,
  sanitizeInput
};