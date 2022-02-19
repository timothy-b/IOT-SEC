import { FunctionalComponent, h } from 'preact';
import { Route, Router } from 'preact-router';

import Config from '../routes/config';
import Status from '../routes/status';
import NotFoundPage from '../routes/notfound';
import Header from './header';

const App: FunctionalComponent = () => {
	return (
		<div id="preact_root">
			<Header />
			<Router>
				<Route path="/" component={Status} />
				<Route path="/config/" component={Config} />
				<NotFoundPage default />
			</Router>
		</div>
	);
};

export default App;
