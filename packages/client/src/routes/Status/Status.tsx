import { FunctionalComponent, h } from 'preact';
import style from './style.css';

const Status: FunctionalComponent = () => {
	return (
		<div class={style.status}>
			<h1>Status</h1>
			<p>status things</p>
		</div>
	);
};

export default Status;
