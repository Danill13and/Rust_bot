const axios = require('axios');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const apiKey = process.env.apiKey;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rinventory')
        .setDescription('Показывает инвентарь и цены игрока')
        .addStringOption(option =>
            option
                .setName('steamid')
                .setDescription('Введите ваш Steam ID')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const steamId = interaction.options.getString('steamid');
        const stats = await getInventory(steamId);

        if (!stats) {
            return interaction.editReply('🛑 Ошибка. Убедитесь, что ваш профиль Steam открыт и попробуйте снова.');
        }

        const { img, nik, inventory, totalPrice } = stats;
        const inventoryItems = Object.values(inventory);

        // Создаем embed для профиля
        const statsEmbed = new EmbedBuilder()
            .setColor(0x00FFFF)
            .setTitle(`Інвентар ${nik || 'Гравця'}`)
            .setThumbnail(img || 'https://example.com/default-avatar.png')
            .setDescription(`Загальна вартість інвентарю: **${totalPrice} UAH**`);

        await interaction.editReply({ embeds: [statsEmbed] });

        // Разбиваем инвентарь на группы по 10 предметов и отправляем несколько сообщений
        const itemsPerMessage = 100;
        for (let i = 0; i < inventoryItems.length; i += itemsPerMessage) {
            const itemsChunk = inventoryItems.slice(i, i + itemsPerMessage);
            
            const itemsDescription = itemsChunk.map(item => `**${item.name}**: ${item.price}`).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0x00FFFF)
                .setDescription(itemsDescription);

            await interaction.followUp({ embeds: [embed] });
        }
    }
};

async function getInventory(input) {
    try {
        const steamUrlPattern = /https?:\/\/steamcommunity\.com\/profiles\/(\d+)/;
        let steamId = input;
        let img, nik, totalPrice = 0;
        const inventory = {};

        if (steamUrlPattern.test(input)) {
            steamId = input.match(steamUrlPattern)[1];
        } else {
            steamId = input;
        }

        const rustInventory = await axios.get(`https://steamcommunity.com/inventory/${steamId}/252490/2?l=english&count=5000`);
        const steam = await axios.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`);

        if (steam.data && steam.data.response && steam.data.response.players.length > 0) {
            const player = steam.data.response.players[0];
            img = player.avatarfull;
            nik = player.personaname;
        }

        const money = await axios.get('https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=11');
        const exchangeRate = parseFloat(money.data[1].buy);

        if (rustInventory.data && rustInventory.data.assets) {
            for (let i = 0; i < rustInventory.data.descriptions.length; i++) {
                const item = rustInventory.data.descriptions[i];
                if (item.tradable === 1 && item.marketable === 1) {
                    try {
                        const itemPriceResponse = await axios.get(`https://steamcommunity.com/market/priceoverview/?appid=252490&currency=1&market_hash_name=${encodeURIComponent(item.market_hash_name)}`);

                        if (itemPriceResponse.data && itemPriceResponse.data.lowest_price) {
                            const priceInUsd = parseFloat(itemPriceResponse.data.lowest_price.replace('$', ''));
                            const priceInUah = (priceInUsd * exchangeRate).toFixed(2);
                            totalPrice += Number(priceInUah);

                            inventory[`item${i}`] = {
                                name: item.market_hash_name,
                                price: `${priceInUah} UAH`
                            };
                        }
                    } catch (err) {
                        console.log(`Не удалось получить цену для ${item.market_hash_name}:`, err.message);
                    }
                }
            }
            return { img, nik, inventory, totalPrice };
        }
    } catch (error) {
        console.log('Ошибка при запросе инвентаря:', error.message);
        return null;
    }
}
