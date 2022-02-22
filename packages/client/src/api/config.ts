import { IConfig } from '@service/types/IConfig';

export const getConfig = async (authorization: string): Promise<IConfig> => {
	const res = await fetch(`/service/iotsec/config`, {
		method: 'GET',
		headers: { authorization },
	});
	return res.status >= 300 ? null : await res.json();
};
