import { FunctionalComponent, h } from 'preact';
import { Route, Router } from 'preact-router';

import Status from 'src/routes/Status';
import NotFound from '../routes/NotFound';
import Header from './header';

const App: FunctionalComponent = () => {
	return (
		<div id="preact_root">
			<Header />
			<Router>
				<Route path="/" component={Status} />
				<NotFound default />
			</Router>
		</div>
	);
};

export default App;
