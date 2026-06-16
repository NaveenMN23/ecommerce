export interface User {
  id: string;
  name: string;
  email: string;
}

export const USERS: Map<string, User> = new Map([
  ['user1', { id: 'user1', name: 'Naveen Kumar',  email: 'naveen@example.com' }],
  ['user2', { id: 'user2', name: 'Priya Sharma',  email: 'priya@example.com' }],
  ['user3', { id: 'user3', name: 'Rahul Verma',   email: 'rahul@example.com' }],
]);
