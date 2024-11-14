import { createContext } from 'preact';

// eslint-disable-next-line no-spaced-func
export default createContext<{
	authHeader: string;
	// eslint-disable-next-line no-unused-vars
	setAuthHeader: (authentication: string) => void;
}>({ authHeader: '', setAuthHeader: () => {} });
