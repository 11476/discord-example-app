import { InstallGlobalCommands } from './utils.js';

const CHECK_STATUS_COMMAND = {
  name: 'checkstatus',
  description: 'Check if the bot is down',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const MESSAGE_ANALYZE_COMMAND = {
  name: 'analyze',
  type: 3,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};
const MESSAGE_COMMENT_COMMAND = {
  name: 'rating',
  type: 3,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};
const ALL_COMMANDS = [CHECK_STATUS_COMMAND, MESSAGE_ANALYZE_COMMAND, MESSAGE_COMMENT_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
