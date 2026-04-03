// Simple test to check if AuthService can be imported
import authService from './src/services/AuthService';

console.log('AuthService imported:', authService);
console.log('AuthService type:', typeof authService);
console.log('AuthService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(authService)));
console.log('Has register method:', typeof authService.register);
console.log('Register method:', authService.register);
