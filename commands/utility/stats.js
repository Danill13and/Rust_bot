const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require('axios');

module.exports = {
	cooldown: 15,
	data: new SlashCommandBuilder()
		.setName('rstats')
		.setDescription('Shows player stats')
		.addStringOption(option =>
			option
                .setName('steamid')
                .setDescription('Напиши свій steam id')
                .setRequired(true)
		),
	async execute(interaction) {
		// Получаем данные
		const stats = await getPlayerStats(interaction.options.getString('steamid'));

		// Проверяем, что данные успешно получены
		if (!stats) {
			return interaction.reply('🛑 Помилка. Відкрийте обліковий запис steam і спробуйте ще раз через декілька годин.');
		}

		// Создаем Embed для отображения статистики
		const statsEmbed = new EmbedBuilder()
    	.setColor(0x00FFFF)
    	.setTitle(`${stats.nik || 'Игрок'} Stats`)
    	.setThumbnail(stats.img || 'https://example.com/default-avatar.png')
    	.addFields(
    	    { name: '🔫 Kills', value: stats.kills?.toString() || 'N/A', inline: true },
    	    { name: '💀 Deaths', value: stats.deaths?.toString() || 'N/A', inline: true },
    	    { name: '😈 K/D Ratio', value: (stats.deaths !== 0 ? (stats.kills / stats.deaths).toFixed(2) : 'N/A'), inline: true },
    	    { name: '⏳ Hours Played', value: stats.hoursPlayed?.toFixed(2).toString() || 'N/A', inline: true },
    	    { name: '🎯 Headshots', value: stats.headshots?.toString() || 'N/A', inline: true },
    	    { name: '📈 Accuracy', value: stats.accuracy?.toFixed(2) + '%' || 'N/A', inline: true },
    	    { name: '💉 Wounded', value: stats.wounded?.toString() || 'N/A', inline: true },
    	    { name: '🚀 Rockets Fired', value: stats.rocketsFired?.toString() || 'N/A', inline: true },
    	    { name: '🐎 Horse distance (km)', value: stats.horseDistanceRidingInKm?.toString() || 'N/A', inline: true },
    	    { name: '💔 Suicide', value: stats.deathSuicide?.toString() || 'N/A', inline: true },
    	    { name: '👨🏻‍🔬 Kill scientist', value: stats.killScientist?.toString() || 'N/A', inline: true },
    	    { name: '🛢️ Destroyed barrels', value: stats.destroyedBarrels?.toString() || 'N/A', inline: true },
    	)
    	.setFooter({ text: 'RUST UA Community' })
    	.setTimestamp();
		// Отправка Embed в чат
		await interaction.reply({ embeds: [statsEmbed] });
	},
};

async function getPlayerStats(input) {
	try {
		const apiKey = process.env.apiKey;;
		const steamUrlPattern = /https?:\/\/steamcommunity\.com\/profiles\/(\d+)/;
		const steamCustomeUrlPattern = /https?:\/\/steamcommunity\.com\/id\/(\d+)/;

		let steamId;

		if (steamUrlPattern.test(input)) {
			steamId = input.match(steamUrlPattern)[1];
		} 
		else if (steamCustomeUrlPattern.test(input)){
			cconst customId = input.match(steamCustomeUrlPattern)[1];
			getingIdFromCustomId = await axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${customId}`)
			steamId = getingIdFromCustomId.data.response.steamId
		} else {
			steamId = input;
		}

		const rust = await axios.get(`https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=252490&key=${apiKey}&steamid=${steamId}`);
		const steam = await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`);
		const library = await axios.get(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json`);

		let kills = 0, deaths = 0, hoursPlayed = 0, headshots = 0, wounded = 0, rocketsFired = 0, accuracy = 0, img, nik, horseDistanceRidingInKm = 0, deathSuicide = 0, killScientist = 0, destroyedBarrels = 0;

		if (rust.data && rust.data.playerstats && rust.data.playerstats.stats) {
			const stats = rust.data.playerstats.stats;
			kills = stats.find(stat => stat.name === 'kill_player')?.value || 0;
			deaths = stats.find(stat => stat.name === 'deaths')?.value || 0;
			headshots = stats.find(stat => stat.name === 'headshot')?.value || 0;
			wounded = stats.find(stat => stat.name === 'wounded')?.value || 0;
			rocketsFired = stats.find(stat => stat.name === 'rocket_fired')?.value || 0;
			const bulletHits = (stats.find(stat => stat.name === 'bullet_hit_player')?.value || 0) + (stats.find(stat => stat.name === 'bullet_hit_entity')?.value || 0);
			const bulletsFired = stats.find(stat => stat.name === 'bullet_fired')?.value || 1;
			accuracy = (bulletHits / bulletsFired) * 100;
			horseDistanceRidingInKm = stats.find(stat => stat.name === 'horse_distance_ridden_km')?.value || 0;
			deathSuicide = stats.find(stat => stat.name === 'death_suicide')?.value || 0;
			killScientist = stats.find(stat => stat.name === 'kill_scientist')?.value || 0;
			destroyedBarrels = stats.find(stat => stat.name === 'destroyed_barrels')?.value || 0;
		} else {
			console.log('Не удалось получить статистику игрока в Rust.');
		}

		if (steam.data && steam.data.response && steam.data.response.players.length > 0) {
			const player = steam.data.response.players[0];
			img = player.avatarfull;
			nik = player.personaname;
		} else {
			console.log('Пользователь не найден в Steam.');
		}

		if (library.data && library.data.response && library.data.response.games) {
			const game = library.data.response.games.find(g => g.appid === 252490);
			if (game) {
				hoursPlayed = game.playtime_forever / 60;
			} else {
				console.log('Игра Rust не найдена в библиотеке пользователя.');
			}
		} else {
			console.log('Не удалось получить библиотеку игр пользователя.');
		}

		// Возвращаем объект с результатами
		return { kills, deaths, hoursPlayed, headshots, wounded, rocketsFired, accuracy, img, nik, horseDistanceRidingInKm, deathSuicide, killScientist, destroyedBarrels};
	} catch (error) {
		console.error('Ошибка при запросе данных:', error);
		return null;
	}
}
