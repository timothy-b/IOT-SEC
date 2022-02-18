const { createLogger } = require('bunyan');

const log = createLogger({ src: true, name: 'test' });

log.info({ something: 'someval' }, 'this should have a stack trace');
