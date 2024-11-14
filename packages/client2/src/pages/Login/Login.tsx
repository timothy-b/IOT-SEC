import { styled } from "goober";
import type { FunctionalComponent, h } from "preact";
import { useCallback, useState } from "preact/hooks";

const LoginContainer = styled('div')`
    display: flex;
	flex-direction: column;
	align-items: center;
`;

interface ILogin {
    onSuccess?: () => void;
    onFail?: () => void;
}

// TODO: wire up auth
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const Login: FunctionalComponent<ILogin> = ({ onSuccess, onFail }) => {
    //const { setAuthHeader } = useContext(authContext);

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

    // const handleSubmit: h.JSX.MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
    //     // const encoded = Buffer.from(`${username}:${password}`).toString('base64');
    //     const encoded = btoa(`${username}:${password}`);
    //     const result = await getConfig(encoded);
    //     if (!result) {
    //         return onFail?.();
    //     }
    //     setAuthHeader(encoded);
    // }, [username, password, onFail, setAuthHeader]);

    const handleSubmit: h.JSX.MouseEventHandler<HTMLButtonElement> = useCallback(async () => {
        const encoded = btoa(`${username}:${password}`);

        console.log(encoded);
    }, [username, password, onFail]);

    return (
        <LoginContainer>
            <h1>Login</h1>

            <label>Username</label>
            <input type="text" onChange={handleUsernameChange} />

            <label>Password</label>
            <input type="password" onChange={handlePasswordChange} />

            <button onClick={handleSubmit}>Submit</button>
        </LoginContainer>
    );
}