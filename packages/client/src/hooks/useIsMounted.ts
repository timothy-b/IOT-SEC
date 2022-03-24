import { useCallback, useEffect, useRef } from 'preact/hooks';

function useIsMounted() {
	const isMounted = useRef(false);

	useEffect(() => {
		isMounted.current = true;

		return () => {
			isMounted.current = false;
		};
	}, []);

	return useCallback(() => isMounted.current, []);
}

export default useIsMounted;
