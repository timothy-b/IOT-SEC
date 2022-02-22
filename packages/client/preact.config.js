import { resolve } from 'path';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';

export default {
	/**
	 * Function that mutates the original webpack config.
	 * Supports asynchronous changes when a promise is returned (or it's an async function).
	 *
	 * @param {object} config - original webpack config.
	 * @param {object} env - options passed to the CLI.
	 * @param {WebpackConfigHelpers} helpers - object with useful helpers for working with the webpack config.
	 * @param {object} options - this is mainly relevant for plugins (will always be empty in the config), default to an empty object
	 **/
	webpack(config, env, helpers, options) {
		// Add TsconfigPathsPlugin for webpack
		// This allows webpack to resolve your imports whose location depends
		// on the `baseUrl` and `paths` fields of your `tsconfig.json`
		// https://github.com/dividab/tsconfig-paths-webpack-plugin#tsconfig-paths-webpack-plugin
		config.resolve.plugins = [
			...(config.resolve.plugins || []),
			new TsconfigPathsPlugin({
				// We use `config.resolve.extensions` to load the same extensions
				// as webpack already does. If you are to edit this property,
				// do it before this call if you want TsconfigPathsPlugin
				// to beneficiate from it
				extensions: config.resolve.extensions,
			}),
		];

		// Use any `index` file, not just index.js
		config.resolve.alias['preact-cli-entrypoint'] = resolve(process.cwd(), 'src', 'index');

		config.devServer.proxy = [
			{
				// proxy requests matching a pattern:
				path: '/service/**',

				// where to proxy to:
				target: 'http://localhost:8000',

				// optionally change Origin: and Host: headers to match target:
				changeOrigin: true,
				changeHost: true,

				// optionally mutate request before proxying:
				pathRewrite: function (path, req) {
					// you can modify the outbound proxy request here:
					delete req.headers.referer;

					// common: remove first path segment: (/api/**)
					return '/' + path.replace(/^\/[^\/]+\//, '');
				},

				// optionally mutate proxy response:
				onProxyRes: function (proxyRes, req, res) {
					// you can modify the response here:
					proxyRes.headers.connection = 'keep-alive';
					proxyRes.headers['cache-control'] = 'no-cache';
				},
			},
		];
	},
};
