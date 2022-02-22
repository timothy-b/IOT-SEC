import { FunctionalComponent, h } from 'preact';
import { Link } from 'preact-router/match';
import style from './style.css';

interface IHeader {
	disableLinks?: boolean;
}

const Header: FunctionalComponent<IHeader> = ({ disableLinks }) => {
	return (
		<header class={style.header}>
			<h1>IOT-SEC</h1>
			{disableLinks ? null : (
				<nav>
					<Link activeClassName={style.active} href="/">
						Status
					</Link>
					<Link activeClassName={style.active} href="/config">
						Config
					</Link>
				</nav>
			)}
		</header>
	);
};

export default Header;
