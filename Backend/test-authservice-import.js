// Simple test to check if AuthService can be imported
const authService = require('./src/services/AuthService').default;

console.log('AuthService imported:', authService);
console.log('AuthService type:', typeof authService);
console.log('AuthService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(authService)));
console.log('Has register method:', typeof authService.register);
