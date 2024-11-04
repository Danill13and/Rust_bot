const { REST, Routes } = require('discord.js');
const clientId = process.env.clientId, token = process.env.token;

const rest = new REST().setToken(token);

// rest.delete(Routes.applicationGuildCommand(clientId, guildId, 'commandId'))
// 	.then(() => console.log('Successfully deleted guild command'))
// 	.catch(console.error);

// for global commands
rest.delete(Routes.applicationCommand(clientId, '1300950420780220501'))
    .then(() => console.log('Successfully deleted application command'))
    .catch(console.error);
