import testService from './test-simple-class';

console.log('TestService imported:', testService);
console.log('Has testMethod:', typeof testService.testMethod);
console.log('testMethod result:', testService.testMethod());
