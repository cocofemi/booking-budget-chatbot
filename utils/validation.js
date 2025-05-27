// utils/validateInput.js
module.exports = {
  isValidPositiveInteger(value) {
    const num = parseInt(value);
    return !isNaN(num) && Number.isInteger(num) && num > 0;
  },

  isValidFloat(value) {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  },

  isValidEmail(value) {
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(value.trim());
  },

  isValidDate(value) {
    const date = Date.parse(value);
    return !isNaN(date);
  },
};
