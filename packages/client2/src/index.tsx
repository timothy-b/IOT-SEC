import { setup } from 'goober';
import { h, render } from 'preact';
import { LocationProvider, Route, Router } from 'preact-iso';
import { Header } from './components/Header.jsx';
import { Home } from './pages/Home/index.jsx';
import { Login } from './pages/Login/Login';
import { Status } from './pages/Status/Status';
import { NotFound } from './pages/_404.jsx';
import './style.css';

// required for goober
setup(h);

export function App() {
	return (
		<LocationProvider>
			<Header />
			<main>
				<Router>
					<Route path="/" component={Home} />
					<Route path="/login" component={Login} />
					<Route path="/status" component={Status} />
					<Route default component={NotFound} />
				</Router>
			</main>
		</LocationProvider>
	);
}

render(<App />, document.getElementById('app'));
