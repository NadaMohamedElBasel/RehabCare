export const isEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isPhone = (num) =>
  /^[0-9]{10,15}$/.test(num);

export const isStrongPassword = (pass) =>
  pass.length >= 6;
