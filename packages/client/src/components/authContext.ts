import { createContext } from 'preact';
export default createContext<{
	authHeader: string;
	setAuthHeader: (authentication: string) => void;
}>({ authHeader: '', setAuthHeader: () => {} });
