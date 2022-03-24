import { createContext } from 'preact';

// eslint-disable-next-line no-spaced-func
export default createContext<{
	authHeader: string;
	setAuthHeader: (authentication: string) => void;
}>({ authHeader: '', setAuthHeader: () => {} });
