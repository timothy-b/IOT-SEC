import { FunctionalComponent, h } from 'preact';
import { Route, Router } from 'preact-router';
import { useCallback, useRef, useState } from 'preact/hooks';

import Login from 'src/routes/Login';
import Status from 'src/routes/Status';
import NotFound from '../routes/NotFound';
import authContext from './authContext';
import Header from './Header';
import Toaster, { IToasterRef } from './Toaster';

const App: FunctionalComponent = () => {
	const toasterRef = useRef<IToasterRef>(null);
	const handleMakeToast = useCallback(
		(message: string) => toasterRef.current?.makeToast(message),
		[]
	);

	const [authHeader, setAuthHeader] = useState<string>('');

	return (
		<authContext.Provider value={{ authHeader, setAuthHeader }}>
			<div id="preact_root">
				<Header disableLinks={!authHeader} />
				{!authHeader ? (
					<Login onFail={() => handleMakeToast('Invalid credentials')} />
				) : (
					<Router>
						<Route path="/" component={Status} />
						<NotFound default />
					</Router>
				)}
			</div>
			<Toaster ref={toasterRef} />
		</authContext.Provider>
	);
};

export default App;
