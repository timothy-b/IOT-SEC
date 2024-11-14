import Preact from 'preact';
import { useLocation } from 'preact-iso';

interface HeaderProps {
	disableLinks?: boolean;
}

export const Header: Preact.FunctionalComponent<HeaderProps> = ({ disableLinks }) => {
	const { url } = useLocation();

	return (
		<header>
			<h1>IOT-SEC</h1>
			{disableLinks ? null : (
				<nav>
					<a href="/" class={url == '/' && 'active'}>
						Home
					</a>
					<a href="/status" class={url == '/status' && 'active'}>
						Status
					</a>
					<a href="/config" class={url == '/config' && 'active'}>
						Config
					</a>
				</nav>
			)}
		</header>
	);
}
