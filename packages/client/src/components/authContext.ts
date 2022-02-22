import { createContext, h } from 'preact';
export default createContext({ authHeader: '', setAuthHeader: (authHeader: string) => {} });
