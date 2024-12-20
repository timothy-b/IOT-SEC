import { h } from 'preact';
import { forwardRef } from 'preact/compat';
import { useCallback, useImperativeHandle, useState } from 'preact/hooks';
import style from './style.css';

interface IToaster {
	defaultTimeout?: number;
}

export interface IToasterRef {
	// eslint-disable-next-line no-unused-vars
	makeToast: (message: string, timeout?: number) => void;
}

const Toaster = forwardRef<IToasterRef, IToaster>(({ defaultTimeout = 5000 }, ref) => {
	const [toasts, setToasts] = useState<h.JSX.Element[]>([]);

	const toastFactory = useCallback((message: string, timeout: number = defaultTimeout) => {
		setTimeout(() => setToasts((toasts) => toasts.slice(1, toasts.length)), timeout);
		return (
			<output className={style.toast} role="status">
				{message}
			</output>
		);
	}, [defaultTimeout]);

	useImperativeHandle(ref, () => ({
		makeToast(message: string) {
			setToasts((toasts) => toasts.concat(toastFactory(message)));
		},
	}));

	return <section className={style.Toaster}>{toasts}</section>;
});

export default Toaster;

/*
					  .___________.
					  |           |
	   ___________.   |  |    /~\ |
	  / __   __  /|   | _ _   |_| |
	 / /:/  /:/ / |   !________|__!
	/ /:/  /:/ /  |            |
   / /:/  /:/ /   |____________!
  / /:/  /:/ /    |
 / /:/  /:/ /     |
/  ~~   ~~ /      |
|~~~~~~~~~~|      |
|    ::    |     /
|    ==    |    /
|    ::    |   /
|    ::    |  /
|    ::  @ | /
!__________!/
*/
