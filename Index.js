const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startKeepAlive } = require('./keepAlive');

startKeepAlive();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const OWNER_ID = "1327822626193805384";
const DEFAULT_ALLOWED_IDS = [
  OWNER_ID,
  "1432992707164246057",
  "1472680383291068416"
];
const STATE_FILE = path.join(__dirname, 'state.json');

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ownerOnly: parsed.ownerOnly ?? true,
      allowedIds: Array.isArray(parsed.allowedIds) ? parsed.allowedIds : DEFAULT_ALLOWED_IDS
    };
  } catch {
    return { ownerOnly: true, allowedIds: DEFAULT_ALLOWED_IDS };
  }
}

function saveState() {
  try {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ ownerOnly, allowedIds: [...ALLOWED_IDS] }, null, 2)
    );
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

const _state = loadState();
let ownerOnly = _state.ownerOnly;
const ALLOWED_IDS = new Set(_state.allowedIds);
ALLOWED_IDS.add(OWNER_ID); // owner is always allowed

const startedAt = Date.now();

client.on('error', (err) => {
  console.error('Client error:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

client.on('shardDisconnect', (event, shardId) => {
  console.warn(`[shard ${shardId}] Disconnected (code ${event.code}). Will attempt to reconnect...`);
});

client.on('shardReconnecting', (shardId) => {
  console.log(`[shard ${shardId}] Reconnecting to Discord...`);
});

client.on('shardResume', (shardId, replayedEvents) => {
  console.log(`[shard ${shardId}] Resumed. Replayed ${replayedEvents} event(s).`);
});

client.on('shardReady', (shardId) => {
  console.log(`[shard ${shardId}] Ready.`);
});

// ====== Slash Command ======
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello to the bot')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot echo a message')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to echo')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout (mute) a user for a number of minutes')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to timeout')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('minutes')
        .setDescription('How many minutes to timeout for (1 - 40320 / 28 days)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove an active timeout from a user')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to untimeout')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for removing the timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk-delete the last N messages in this channel')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('How many messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show account & server info for a member')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to look up (defaults to you)')
        .setRequired(false)
    )
    .setDMPermission(false)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show stats about this server')
    .setDMPermission(false)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a quick reaction poll (up to 10 options)')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The poll question')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('options')
        .setDescription('Comma-separated answers, e.g. "yes,no,maybe" (2-10)')
        .setRequired(true)
    )
    .setDMPermission(false)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Show a user's avatar in full size")
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User to show (defaults to you)')
        .setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription("List all of the bot's commands")
    .toJSON(),

  new SlashCommandBuilder()
    .setName('owner-only')
    .setDescription('Toggle whether only the owner can use this bot')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('true = lock to owner, false = open to everyone')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription("Show the bot's uptime, ping, and current settings")
    .toJSON(),

  new SlashCommandBuilder()
    .setName('allow')
    .setDescription('Manage which users are allowed to use this bot (owner only)')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Allow a user to use the bot')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to add')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a user from the allowlist')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Show all allowed users')
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Post a formatted announcement embed in a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to post the announcement in')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Announcement message')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Optional embed title (defaults to "ð¢ Announcement")')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('mention_everyone')
        .setDescription('Ping @everyone with the announcement')
        .setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('channel-create')
    .setDescription('Create a new channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name of the new channel')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Channel type (default: text)')
        .setRequired(false)
        .addChoices(
          { name: 'Text', value: 'text' },
          { name: 'Voice', value: 'voice' },
          { name: 'Announcement', value: 'announcement' },
          { name: 'Stage', value: 'stage' },
          { name: 'Forum', value: 'forum' }
        )
    )
    .addChannelOption(option =>
      option.setName('category')
        .setDescription('Category to place the channel under')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('channel-delete')
    .setDescription('Delete a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to delete')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('role-create')
    .setDescription('Create a new role')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name of the new role')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Hex color, e.g. #ff5500 (optional)')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('hoist')
        .setDescription('Display members with this role separately in the sidebar')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option.setName('mentionable')
        .setDescription('Allow anyone to @mention this role')
        .setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('role-delete')
    .setDescription('Delete a role')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to delete')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('role-give')
    .setDescription('Assign a role to a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Member to give the role to')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to assign')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('role-take')
    .setDescription('Remove a role from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false)
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Member to remove the role from')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to remove')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('nick')
    .setDescription("Change a member's server nickname (leave blank to reset)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .setDMPermission(false)
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Member to rename')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('nickname')
        .setDescription('New nickname (leave blank to reset to their username)')
        .setRequired(false)
        .setMaxLength(32)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Send a private direct message to a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Member to DM')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message to send')
        .setRequired(true)
        .setMaxLength(2000)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel so @everyone cannot send messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to lock (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for locking the channel')
        .setRequired(false)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a previously locked channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to unlock (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for unlocking the channel')
        .setRequired(false)
    )
    .toJSON()
];

// ====== Register commands ======
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Slash commands registered!');
  } catch (error) {
    console.error(error);
  }
});

function formatUptime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// ====== Command handler ======
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {

  // The /allow command is always restricted to the owner.
  if (interaction.commandName === 'allow') {
    if (interaction.user.id !== OWNER_ID) {
      await interaction.reply({
        content: "â Only the bot owner can manage the allowlist.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      if (ALLOWED_IDS.has(user.id)) {
        await interaction.reply({ content: `${user.tag} is already on the allowlist.`, flags: MessageFlags.Ephemeral });
        return;
      }
      ALLOWED_IDS.add(user.id);
      saveState();
      await interaction.reply({ content: `â Added ${user.tag} (${user.id}) to the allowlist.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      if (user.id === OWNER_ID) {
        await interaction.reply({ content: 'â You cannot remove the owner from the allowlist.', flags: MessageFlags.Ephemeral });
        return;
      }
      if (!ALLOWED_IDS.has(user.id)) {
        await interaction.reply({ content: `${user.tag} is not on the allowlist.`, flags: MessageFlags.Ephemeral });
        return;
      }
      ALLOWED_IDS.delete(user.id);
      saveState();
      await interaction.reply({ content: `ðï¸ Removed ${user.tag} (${user.id}) from the allowlist.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === 'list') {
      const lines = [...ALLOWED_IDS].map(id => `â¢ <@${id}> (\`${id}\`)${id === OWNER_ID ? ' â owner' : ''}`).join('\n');
      const embed = {
        title: 'ð¥ Allowlist',
        description: lines || '_(empty)_',
        color: 0x5865F2,
        footer: { text: `${ALLOWED_IDS.size} user(s) allowed` }
      };
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }
  }

  // The owner-only toggle command is always restricted to the owner,
  // even when the bot is open to everyone.
  if (interaction.commandName === 'owner-only') {
    if (interaction.user.id !== OWNER_ID) {
      await interaction.reply({
        content: "â Only the bot owner can change this setting.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    const enabled = interaction.options.getBoolean('enabled');
    ownerOnly = enabled;
    saveState();
    await interaction.reply({
      content: enabled
        ? 'ð Owner-only mode is now **ON**. Only you can use the bot.'
        : 'ð Owner-only mode is now **OFF**. Anyone can use the bot.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // ð ONLY ALLOWED USERS CAN USE (when ownerOnly is true)
  if (ownerOnly && !ALLOWED_IDS.has(interaction.user.id)) {
    await interaction.reply({
      content: "â You are not allowed to use this bot.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (interaction.commandName === 'ping') {
    await interaction.reply('ð Pong!');
  }

  if (interaction.commandName === 'hello') {
    await interaction.reply(`Hello ${interaction.user.username} ð`);
  }

  if (interaction.commandName === 'say') {
    const message = interaction.options.getString('message');
    await interaction.reply(message);
  }

  if (interaction.commandName === 'channel-create') {
    const name = interaction.options.getString('name');
    const typeChoice = interaction.options.getString('type') ?? 'text';
    const category = interaction.options.getChannel('category');

    const typeMap = {
      text: ChannelType.GuildText,
      voice: ChannelType.GuildVoice,
      announcement: ChannelType.GuildAnnouncement,
      stage: ChannelType.GuildStageVoice,
      forum: ChannelType.GuildForum
    };

    const me = await interaction.guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "I don't have the **Manage Channels** permission.", flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const channel = await interaction.guild.channels.create({
        name,
        type: typeMap[typeChoice],
        parent: category ? category.id : undefined,
        reason: `Created by ${interaction.user.tag}`
      });
      await interaction.reply({ content: `â Created channel ${channel}.`, flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('channel-create error:', err);
      await interaction.reply({ content: `Failed to create channel: ${err.message}`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'channel-delete') {
    const channel = interaction.options.getChannel('channel');

    const me = await interaction.guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "I don't have the **Manage Channels** permission.", flags: MessageFlags.Ephemeral });
      return;
    }

    const target = await interaction.guild.channels.fetch(channel.id).catch(() => null);
    if (!target) {
      await interaction.reply({ content: 'That channel no longer exists.', flags: MessageFlags.Ephemeral });
      return;
    }

    const channelName = target.name;
    try {
      await target.delete(`Deleted by ${interaction.user.tag}`);
      await interaction.reply({ content: `ðï¸ Deleted channel **#${channelName}**.`, flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('channel-delete error:', err);
      await interaction.reply({ content: `Failed to delete channel: ${err.message}`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'role-create') {
    const name = interaction.options.getString('name');
    const colorInput = interaction.options.getString('color');
    const hoist = interaction.options.getBoolean('hoist') ?? false;
    const mentionable = interaction.options.getBoolean('mentionable') ?? false;

    let color;
    if (colorInput) {
      const hex = colorInput.replace(/^#/, '');
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
        await interaction.reply({ content: 'Color must be a 6-digit hex like `#ff5500`.', flags: MessageFlags.Ephemeral });
        return;
      }
      color = parseInt(hex, 16);
    }

    const me = await interaction.guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: "I don't have the **Manage Roles** permission.", flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const role = await interaction.guild.roles.create({
        name,
        color,
        hoist,
        mentionable,
        reason: `Created by ${interaction.user.tag}`
      });
      await interaction.reply({ content: `â Created role ${role}.`, flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('role-create error:', err);
      await interaction.reply({ content: `Failed to create role: ${err.message}`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'role-delete') {
    const role = interaction.options.getRole('role');

    if (role.id === interaction.guild.id) {
      await interaction.reply({ content: 'I cannot delete the **@everyone** role.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (role.managed) {
      await interaction.reply({ content: 'That role is managed by an integration and cannot be deleted.', flags: MessageFlags.Ephemeral });
      return;
    }

    const me = await interaction.guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: "I don't have the **Manage Roles** permission.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (role.position >= me.roles.highest.position) {
      await interaction.reply({ content: `I can't delete **${role.name}** because it's higher than (or equal to) my highest role.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const roleName = role.name;
    try {
      await role.delete(`Deleted by ${interaction.user.tag}`);
      await interaction.reply({ content: `ðï¸ Deleted role **${roleName}**.`, flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('role-delete error:', err);
      await interaction.reply({ content: `Failed to delete role: ${err.message}`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'lock' || interaction.commandName === 'unlock') {
    const locking = interaction.commandName === 'lock';
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const reason = interaction.options.getString('reason') ?? `${locking ? 'Locked' : 'Unlocked'} by ${interaction.user.tag}`;

    if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
      await interaction.reply({ content: 'I can only lock text or announcement channels.', flags: MessageFlags.Ephemeral });
      return;
    }

    const me = await interaction.guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels) || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: "I need both **Manage Channels** and **Manage Roles** permissions to do this.", flags: MessageFlags.Ephemeral });
      return;
    }

    const everyone = interaction.guild.roles.everyone;
    const current = channel.permissionOverwrites.cache.get(everyone.id);

    if (locking && current?.deny.has(PermissionFlagsBits.SendMessages)) {
      await interaction.reply({ content: `${channel} is already locked.`, flags: MessageFlags.Ephemeral });
      return;
    }
    if (!locking && !current?.deny.has(PermissionFlagsBits.SendMessages)) {
      await interaction.reply({ content: `${channel} isn't locked.`, flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await channel.permissionOverwrites.edit(
        everyone,
        { SendMessages: locking ? false : null },
        { reason }
      );
      await interaction.reply({
        content: locking
          ? `ð Locked ${channel}. Reason: ${reason}`
          : `ð Unlocked ${channel}. Reason: ${reason}`
      });
    } catch (err) {
      console.error(`${interaction.commandName} error:`, err);
      await interaction.reply({ content: `Failed: ${err.message}`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'dm') {
    const target = interaction.options.getUser('user');
    const message = interaction.options.getString('message');

    if (target.bot) {
      await interaction.reply({ content: 'You cannot DM a bot.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.id === interaction.user.id) {
      await interaction.reply({ content: 'You cannot DM yourself through the bot.', flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = {
      description: message,
      color: 0x5865F2,
      footer: {
        text: `Sent from ${interaction.guild.name} by ${interaction.user.tag}`,
        icon_url: interaction.guild.iconURL() ?? undefined
      },
      timestamp: new Date().toISOString()
    };

    try {
      await target.send({ embeds: [embed] });
      await interaction.reply({ content: `â DM sent to ${target}.`, flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('dm error:', err);
      await interaction.reply({
        content: `Couldn't DM ${target} â they probably have DMs from server members disabled.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  if (interaction.commandName === 'nick') {
    const target = interaction.options.getUser('user');
    const nickname = interaction.options.getString('nickname');

    const me = await interaction.guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      await interaction.reply({ content: "I don't have the **Manage Nicknames** permission.", flags: MessageFlags.Ephemeral });
      return;
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'That user is not in this server.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (member.id === interaction.guild.ownerId) {
      await interaction.reply({ content: "I can't change the server owner's nickname.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (member.id !== client.user.id && member.roles.highest.position >= me.roles.highest.position) {
      await interaction.reply({ content: `I can't rename ${target} because their highest role is above (or equal to) mine.`, flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await member.setNickname(nickname ?? null, `Changed by ${interaction.user.tag}`);
      if (nickname) {
        await interaction.reply({ content: `â Set ${target}'s nickname to **${nickname}**.`, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: `â Reset ${target}'s nickname.`, flags: MessageFlags.Ephemeral });
      }
    } catch (err) {
      console.error('nick error:', err);
      await interaction.reply({ content: `Failed to change nickname: ${err.message}`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'role-give' || interaction.commandName === 'role-take') {
    const giving = interaction.commandName === 'role-give';
    const target = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');

    if (role.id === interaction.guild.id) {
      await interaction.reply({ content: 'You cannot assign or remove the **@everyone** role.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (role.managed) {
      await interaction.reply({ content: 'That role is managed by an integration and cannot be assigned manually.', flags: MessageFlags.Ephemeral });
      return;
    }

    const me = await interaction.guild.members.fetchMe();
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: "I don't have the **Manage Roles** permission.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (role.position >= me.roles.highest.position) {
      await interaction.reply({ content: `I can't manage **${role.name}** because it's higher than (or equal to) my highest role.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'That user is not in this server.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (giving && member.roles.cache.has(role.id)) {
      await interaction.reply({ content: `${target} already has the **${role.name}** role.`, flags: MessageFlags.Ephemeral });
      return;
    }
    if (!giving && !member.roles.cache.has(role.id)) {
      await interaction.reply({ content: `${target} doesn't have the **${role.name}** role.`, flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      if (giving) {
        await member.roles.add(role, `Given by ${interaction.user.tag}`);
        await interaction.reply({ content: `â Gave ${role} to ${target}.`, flags: MessageFlags.Ephemeral });
      } else {
        await member.roles.remove(role, `Removed by ${interaction.user.tag}`);
        await interaction.reply({ content: `â Removed ${role} from ${target}.`, flags: MessageFlags.Ephemeral });
      }
    } catch (err) {
      console.error(`${interaction.commandName} error:`, err);
      await interaction.reply({ content: `Failed: ${err.message}`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'announce') {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');
    const title = interaction.options.getString('title') ?? 'ð¢ Announcement';
    const mentionEveryone = interaction.options.getBoolean('mention_everyone') ?? false;

    const me = await interaction.guild.members.fetchMe();
    const perms = channel.permissionsFor(me);
    if (!perms || !perms.has(PermissionFlagsBits.SendMessages) || !perms.has(PermissionFlagsBits.EmbedLinks)) {
      await interaction.reply({
        content: `I don't have permission to send embeds in ${channel}.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const embed = {
      title,
      description: message,
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
      footer: {
        text: `Posted by ${interaction.user.tag}`,
        icon_url: interaction.user.displayAvatarURL()
      }
    };

    try {
      await channel.send({
        content: mentionEveryone ? '@everyone' : undefined,
        embeds: [embed],
        allowedMentions: mentionEveryone ? { parse: ['everyone'] } : { parse: [] }
      });
      await interaction.reply({
        content: `â Announcement posted in ${channel}.`,
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      console.error('announce error:', err);
      await interaction.reply({
        content: `Failed to post announcement: ${err.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  if (interaction.commandName === 'ban') {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (target.id === interaction.user.id) {
      await interaction.reply({ content: 'You cannot ban yourself.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.id === client.user.id) {
      await interaction.reply({ content: 'I cannot ban myself.', flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await interaction.guild.members.ban(target, { reason: `${reason} (by ${interaction.user.tag})` });
      await interaction.reply(`ð¨ Banned ${target.tag} â ${reason}`);
    } catch (err) {
      console.error('Ban failed:', err);
      await interaction.reply({ content: `Failed to ban ${target.tag}. Check that I have the Ban Members permission and a higher role than the target.`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'kick') {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (target.id === interaction.user.id) {
      await interaction.reply({ content: 'You cannot kick yourself.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.id === client.user.id) {
      await interaction.reply({ content: 'I cannot kick myself.', flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(target.id);
      await member.kick(`${reason} (by ${interaction.user.tag})`);
      await interaction.reply(`ð¢ Kicked ${target.tag} â ${reason}`);
    } catch (err) {
      console.error('Kick failed:', err);
      await interaction.reply({ content: `Failed to kick ${target.tag}. Make sure they're in the server, I have the Kick Members permission, and my role is higher than theirs.`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'status') {
    const embed = {
      title: 'ð¤ Bot status',
      color: 0x5865F2,
      fields: [
        { name: 'Uptime', value: formatUptime(Date.now() - startedAt), inline: true },
        { name: 'API ping', value: `${client.ws.ping}ms`, inline: true },
        { name: 'Owner-only', value: ownerOnly ? 'ð ON' : 'ð OFF', inline: true },
        { name: 'Servers', value: String(client.guilds.cache.size), inline: true },
        { name: 'Logged in as', value: client.user.tag, inline: true }
      ]
    };
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  if (interaction.commandName === 'help') {
    const embed = {
      title: 'ð Bot commands',
      color: 0x5865F2,
      fields: [
        {
          name: 'General',
          value: [
            '`/ping` â Replies with Pong!',
            '`/hello` â Say hello to the bot',
            '`/say message:<text>` â Make the bot echo a message',
            '`/avatar [target]` â Show a user\'s avatar in full size',
            '`/userinfo [target]` â Show account & server info for a member',
            '`/serverinfo` â Show stats about this server',
            '`/poll question:<q> options:<a,b,c>` â Create a reaction poll (2-10 options)',
            '`/help` â Show this list'
          ].join('\n')
        },
        {
          name: 'Moderation',
          value: [
            '`/ban target:<user> [reason]` â Ban a user (Ban Members)',
            '`/kick target:<user> [reason]` â Kick a user (Kick Members)',
            '`/timeout target:<user> minutes:<n> [reason]` â Mute for N minutes (Moderate Members)',
            '`/untimeout target:<user> [reason]` â Remove an active timeout (Moderate Members)',
            '`/clear amount:<1-100>` â Bulk-delete recent messages (Manage Messages)',
            '`/announce channel:<#> message:<text> [title] [mention_everyone]` â Post an announcement embed (Manage Messages)'
          ].join('\n')
        },
        {
          name: 'Server management',
          value: [
            '`/channel-create name:<text> [type] [category]` â Create a channel (Manage Channels)',
            '`/channel-delete channel:<#>` â Delete a channel (Manage Channels)',
            '`/role-create name:<text> [color] [hoist] [mentionable]` â Create a role (Manage Roles)',
            '`/role-delete role:<@role>` â Delete a role (Manage Roles)',
            '`/role-give user:<@user> role:<@role>` â Assign a role to a member (Manage Roles)',
            '`/role-take user:<@user> role:<@role>` â Remove a role from a member (Manage Roles)',
            '`/nick user:<@user> [nickname]` â Change or reset a member\'s nickname (Manage Nicknames)',
            '`/dm user:<@user> message:<text>` â Send a private DM to a member (Manage Messages)',
            '`/lock [channel] [reason]` â Lock a channel for @everyone (Manage Channels)',
            '`/unlock [channel] [reason]` â Unlock a previously locked channel (Manage Channels)'
          ].join('\n')
        }
      ],
      footer: { text: 'Permission-restricted commands only show up if you have the required permission.' }
    };

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  if (interaction.commandName === 'avatar') {
    const target = interaction.options.getUser('target') ?? interaction.user;
    const url = target.displayAvatarURL({ size: 1024, extension: 'png' });

    const embed = {
      title: `${target.tag}'s avatar`,
      image: { url },
      description: `[Download](${url})`,
      color: 0x5865F2
    };

    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'poll') {
    const question = interaction.options.getString('question');
    const rawOptions = interaction.options.getString('options');
    const choices = rawOptions.split(',').map(s => s.trim()).filter(Boolean);

    if (choices.length < 2 || choices.length > 10) {
      await interaction.reply({ content: 'Please provide between 2 and 10 comma-separated options.', flags: MessageFlags.Ephemeral });
      return;
    }

    const emojis = ['1ï¸â£', '2ï¸â£', '3ï¸â£', '4ï¸â£', '5ï¸â£', '6ï¸â£', '7ï¸â£', '8ï¸â£', '9ï¸â£', 'ð'];
    const description = choices.map((c, i) => `${emojis[i]}  ${c}`).join('\n');

    const embed = {
      title: `ð ${question}`,
      description,
      color: 0x5865F2,
      footer: { text: `Poll by ${interaction.user.tag}` }
    };

    try {
      await interaction.reply({ embeds: [embed] });
      const message = await interaction.fetchReply();
      for (let i = 0; i < choices.length; i++) {
        await message.react(emojis[i]);
      }
    } catch (err) {
      console.error('Poll failed:', err);
      try {
        await interaction.followUp({ content: 'Failed to add reactions. Make sure I have the Add Reactions permission.', flags: MessageFlags.Ephemeral });
      } catch {}
    }
  }

  if (interaction.commandName === 'serverinfo') {
    const guild = interaction.guild;

    try {
      const owner = await guild.fetchOwner();
      const totalMembers = guild.memberCount;
      const channels = guild.channels.cache;
      const textChannels = channels.filter(c => c.type === 0).size;
      const voiceChannels = channels.filter(c => c.type === 2).size;
      const roleCount = guild.roles.cache.size - 1;

      const embed = {
        title: `Server info â ${guild.name}`,
        thumbnail: guild.iconURL({ size: 256 }) ? { url: guild.iconURL({ size: 256 }) } : undefined,
        fields: [
          { name: 'Server ID', value: guild.id, inline: false },
          { name: 'Owner', value: `<@${owner.id}>`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
          { name: 'Members', value: String(totalMembers), inline: true },
          { name: 'Roles', value: String(roleCount), inline: true },
          { name: 'Text channels', value: String(textChannels), inline: true },
          { name: 'Voice channels', value: String(voiceChannels), inline: true },
          { name: 'Boost tier', value: `Tier ${guild.premiumTier}`, inline: true },
          { name: 'Boosts', value: String(guild.premiumSubscriptionCount ?? 0), inline: true }
        ],
        color: 0x5865F2
      };

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Serverinfo failed:', err);
      await interaction.reply({ content: 'Failed to fetch server info.', flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'userinfo') {
    const target = interaction.options.getUser('target') ?? interaction.user;

    try {
      const member = await interaction.guild.members.fetch(target.id);
      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => `<@&${r.id}>`)
        .join(', ') || 'None';

      const embed = {
        title: `User info â ${target.tag}`,
        thumbnail: { url: target.displayAvatarURL({ size: 256 }) },
        fields: [
          { name: 'User ID', value: target.id, inline: false },
          { name: 'Account created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: true },
          { name: 'Joined server', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Unknown', inline: true },
          { name: `Roles (${member.roles.cache.size - 1})`, value: roles.length > 1024 ? roles.slice(0, 1021) + '...' : roles, inline: false }
        ],
        color: member.displayColor || 0x5865F2
      };

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Userinfo failed:', err);
      await interaction.reply({ content: `Failed to fetch info for ${target.tag}.`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'clear') {
    const amount = interaction.options.getInteger('amount');

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.reply({ content: `ð§¹ Deleted ${deleted.size} message(s).`, flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('Clear failed:', err);
      await interaction.reply({ content: `Failed to delete messages. Make sure I have the Manage Messages permission and the messages are less than 14 days old.`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'untimeout') {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    try {
      const member = await interaction.guild.members.fetch(target.id);
      if (!member.isCommunicationDisabled()) {
        await interaction.reply({ content: `${target.tag} is not currently timed out.`, flags: MessageFlags.Ephemeral });
        return;
      }
      await member.timeout(null, `${reason} (by ${interaction.user.tag})`);
      await interaction.reply(`â Removed timeout from ${target.tag} â ${reason}`);
    } catch (err) {
      console.error('Untimeout failed:', err);
      await interaction.reply({ content: `Failed to remove timeout from ${target.tag}. Make sure they're in the server, I have the Moderate Members permission, and my role is higher than theirs.`, flags: MessageFlags.Ephemeral });
    }
  }

  if (interaction.commandName === 'timeout') {
    const target = interaction.options.getUser('target');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (target.id === interaction.user.id) {
      await interaction.reply({ content: 'You cannot timeout yourself.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.id === client.user.id) {
      await interaction.reply({ content: 'I cannot timeout myself.', flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(target.id);
      await member.timeout(minutes * 60 * 1000, `${reason} (by ${interaction.user.tag})`);
      await interaction.reply(`â³ Timed out ${target.tag} for ${minutes} minute(s) â ${reason}`);
    } catch (err) {
      console.error('Timeout failed:', err);
      await interaction.reply({ content: `Failed to timeout ${target.tag}. Make sure they're in the server, I have the Moderate Members permission, and my role is higher than theirs.`, flags: MessageFlags.Ephemeral });
    }
  }

  } catch (err) {
    console.error(`Handler error for /${interaction.commandName}:`, err);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'â ï¸ Something went wrong handling that command.', flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: 'â ï¸ Something went wrong handling that command.', flags: MessageFlags.Ephemeral });
      }
    } catch (replyErr) {
      console.error('Failed to send error reply:', replyErr);
    }
  }
});

client.login(process.env.TOKEN);
