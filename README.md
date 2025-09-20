# DiscordChatBot

Event-driven Discord bot featuring a simple market, user bags, and an anonymous DM utility. Built on discord.js v14 with MongoDB persistence for users/products.

## Features
- Slash commands for bag, market, and anonymous messaging
- Market board auto-updates in a `#market` text channel
- Autocomplete for listing IDs and item names
- Admin tools for seeding items, coins, and market entries

## Tech Stack
- Node.js (CommonJS)
- discord.js v14
- MongoDB via Mongoose

## Prerequisites
- Node.js 18+
- MongoDB running locally (default URI: `mongodb://localhost:27017/discordBot`)
- A Discord Bot application with token, clientId, and a guild to register commands

## Configuration
The bot currently reads credentials from `database/config.json`.

Edit `database/config.json` and set:
```json
{
  "token": "YOUR_BOT_TOKEN",
  "clientId": "YOUR_CLIENT_ID",
  "guildId": "YOUR_GUILD_ID"
}
```
Security note: Avoid committing real tokens to version control. Consider switching to environment variables in the future.

## Install
```bash
npm ci
```

## Deploy Slash Commands
Register commands to a single guild for fast iteration:
```bash
node deploy-commands.js
```

## Run the Bot
```bash
node index.js
```
The bot connects to MongoDB on startup (see `database/db.js`). Ensure MongoDB is running.

## Commands

General
- `/bag view`: Shows your coins and the items in your bag.
- `/market-publish name:<item> price:<coins>`: Lists one unit of an item from your bag for sale. `name` autocompletes from your inventory.
- `/market-buy id:<listing-id>`: Buys a market listing; item is moved to your bag and the seller is paid; the market board updates.
- `/market-remove id:<listing-id>`: Removes one of your listings and returns the item to your bag. `id` autocompletes to your listings.
- `/anonymous user:<user> message:<text>`: Sends an anonymous DM. Receiver can pay 5 coins to reveal the sender. Daily limit (1) and time gate (after 21:00 Europe/Madrid) apply for non-owners.

Owner-Only
- `/bagadmin additem target:<user> name:<item> quantity:<n>`: Adds items to a user’s bag.
- `/bagadmin removeitem target:<user> name:<item> quantity:<n>`: Removes items from a user’s bag (deletes entry if it hits 0).
- `/bagadmin setcoins target:<user> coins:<n>`: Sets a user’s coin balance.
- `/marketadmin insert name:<item> price:<coins>`: Inserts a listing without removing from inventory.
- `/marketadmin remove id:<listing-id>`: Removes any listing (with autocomplete).
- `/marketadmin buy id:<listing-id>`: Buys a listing as admin; credits seller and removes the listing.

## Market Board
- The bot looks for a text channel named `market` in the guild.
- Listings render in a single embed that is edited in-place when possible.

## Project Structure
- `index.js`: Client setup, command/event loading, MongoDB connect
- `deploy-commands.js`: Registers slash commands to the configured guild
- `domain/commands/*`: Slash command implementations
  - `bag/*`, `market/*`, `secrete-message/*`
- `domain/events/*`: Event handlers (`ready`, `interactionCreate`, `guildMemberAdd`)
- `domain/repository/*`: Mongo-backed managers for users/products and in-memory market state
- `database/*`: Connection and Mongoose models

## Troubleshooting
- Commands not appearing: Re-run `node deploy-commands.js`, ensure `clientId/guildId` are correct and the bot is in that guild.
- Missing `#market` channel: Create a text channel named `market` so the board can post/update.
- Mongo errors: Start MongoDB locally or update the URI in `database/db.js` and ensure network access.
- Permission issues: Owner-only commands check against a hardcoded `OWNER_ID` in admin commands. Update it to your Discord user ID if needed.

## Notes
- Code standardized to CommonJS for consistent loading.
- Some responses are ephemeral and visible only to the invoking user.

