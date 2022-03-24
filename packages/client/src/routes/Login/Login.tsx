import { FunctionalComponent, h } from 'preact';
import { useCallback, useContext, useState } from 'preact/hooks';
import { getConfig } from '@api/config';
import style from './style.css';
import authContext from 'src/components/authContext';

interface ILogin {
	onSuccess?: () => void;
	onFail?: () => void;
}

const Login: FunctionalComponent<ILogin> = ({ onFail }) => {
	const { setAuthHeader } = useContext(authContext);

	const [username, setUsername] = useState<string>('');
	const [password, setPassword] = useState<string>('');

	const handleUsernameChange: h.JSX.GenericEventHandler<HTMLInputElement> = useCallback(
		(event) => setUsername((event.target as HTMLInputElement).value),
		[]
	);
	const handlePasswordChange: h.JSX.GenericEventHandler<HTMLInputElement> = useCallback(
		(event) => setPassword((event.target as HTMLInputElement).value),
		[]
	);

	const handleSubmit: h.JSX.MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
		// const encoded = Buffer.from(`${username}:${password}`).toString('base64');
		const encoded = btoa(`${username}:${password}`);
		const result = await getConfig(encoded);
		if (!result) {
			return onFail?.();
		}
		setAuthHeader(encoded);
	}, [username, password, onFail, setAuthHeader]);

	return (
		<div class={style.Login}>
			<h1>Login</h1>

			<label>Username</label>
			<input type="text" onChange={handleUsernameChange} />

			<label>Password</label>
			<input type="password" onChange={handlePasswordChange} />

			<button onClick={handleSubmit}>Submit</button>
		</div>
	);
};

export default Login;
