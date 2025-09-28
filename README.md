# DiscordChatBot

Event-driven Discord bot featuring a simple market, user bags, an anonymous DM utility, and a cooperative mission system. Built on discord.js v14 with MongoDB persistence for users/products.

## Features
- Slash commands for managing bags, market listings, missions, and anonymous DMs
- Mission workflow with evidence uploads, automatic rewards, and audit logging to `#log`
- Market board auto-updates in a `#market` text channel
- Bag board keeps player inventories in sync inside a `#bag` text channel
- Invite tracking assigns team roles automatically when members join via tracked links

## Tech Stack
- Node.js (CommonJS)
- discord.js v14
- MongoDB via Mongoose

## Prerequisites
- Node.js 18+
- MongoDB running locally (default URI: `mongodb://localhost:27017/discordBot`)
- A Discord Bot application with token, clientId, and a guild to register commands
- Bot permissions to manage invites and roles so it can fetch guild invites and assign team roles

## Configuration

### Credentials
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

### Discord Setup
- Create text channels named `market`, `bag`, and `log` for the market board, bag board, and mission audit feed.
- Create roles for each team (default: `Team 1`, `Team 2`, `Team 3`, `Team 4`). Update `TEAM_ROLE_NAMES` in `domain/commands/missions/mission.js` if you need different names.
- Update the invite-to-role mapping in `domain/events/guildMemberAdd.js` to match the permanent invites you use for onboarding.
- Ensure the bot's highest role can manage the team roles so it can assign them on join.
- Update the `OWNER_ID` constant in admin command files if you need an owner override (`domain/commands/bag/bagAdmin.js`, `domain/commands/market/marketAdmin.js`, `domain/commands/missions/missionAdmin.js`).

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
The bot connects to MongoDB on startup (see `database/db.js`). Ensure MongoDB is running and that the bot has permission to fetch guild invites.

## Commands

### General
- `/bag view`: Shows your coins and the items in your bag.
- `/market-publish name:<item> price:<coins>`: Lists one unit of an item from your bag for sale. `name` autocompletes from your inventory.
- `/market-buy id:<listing-id>`: Buys a market listing; item is moved to your bag and the seller is paid; the market board updates.
- `/market-remove id:<listing-id>`: Removes one of your listings and returns the item to your bag. `id` autocompletes to your listings.
- `/anonymous user:<user> message:<text>`: Sends an anonymous DM. Receiver can pay 5 coins to reveal the sender. Daily limit (1) and time gate (after 21:00 Europe/Madrid) apply for non-owners.
- `/mission list`: Lists all missions available to your team.
- `/mission info title:<mission-title>`: Displays the mission description, document requirements, and rewards. The title option autocompletes.
- `/mission submit title:<mission-title> [participant1-5] [doc1-5]`: Upload evidence for a mission with optional teammates and up to five attachments. Documents must match the allowed types (image, pdf, txt).

### Owner/Admin
- `/bagadmin additem target:<user> name:<item> quantity:<n>`: Adds items to a user's bag.
- `/bagadmin removeitem target:<user> name:<item> quantity:<n>`: Removes items from a user's bag (deletes entry if it hits 0).
- `/bagadmin setcoins target:<user> coins:<n>`: Sets a user's coin balance.
- `/marketadmin insert name:<item> price:<coins>`: Inserts a listing without removing from inventory.
- `/marketadmin remove id:<listing-id>`: Removes any listing (with autocomplete).
- `/marketadmin buy id:<listing-id>`: Buys a listing as admin; credits seller and removes the listing.
- `/missionadmin create title:<text> description:<text> [participants] [documents] [same_team] [reward_coins] [reward_items]`: Creates a mission. `documents` accepts a comma-separated list of document types (image,pdf,txt) and `reward_items` uses `item:quantity` pairs.
- `/missionadmin delete title:<mission-title>`: Deletes a mission and its submissions.
- `/missionadmin list`: Lists all missions.

## Mission Workflow
- Participants must hold one of the configured team roles; missions that require the same team enforce matching roles for every participant.
- Additional participants selected during submission are credited with rewards when the mission is accepted.
- Evidence uploads are inspected for their content type or file extension and must match the allowed document types defined in `database/models/mission.js`.
- Submission results are posted to the `#log` channel with full context for auditing.
- Accepted missions automatically award coins and items, and the bag board is refreshed for every participant.

## Boards

### Market Board
- The bot looks for a text channel named `market` in the guild.
- Listings render in a single embed that is edited in-place when possible.

### Bag Board
- The bot looks for a text channel named `bag` in the guild.
- Each user's bag summary is posted or updated when their inventory or coin balance changes.

## Project Structure
- `index.js`: Client setup, command/event loading, MongoDB connect.
- `deploy-commands.js`: Registers slash commands to the configured guild.
- `domain/commands/bag/*`: Bag commands and admin utilities.
- `domain/commands/market/*`: Market command implementations.
- `domain/commands/missions/*`: Mission commands for players and administrators.
- `domain/commands/secrete-message/*`: Anonymous messaging flows.
- `domain/events/*`: Event handlers (`ready`, `interactionCreate`, `guildMemberAdd`).
- `domain/repository/*`: Mongo-backed managers for users/products/missions and in-memory board state.
- `domain/services/bagBoardService.js`: Keeps the bag board channel in sync with user inventories.
- `database/*`: Connection and Mongoose models (`mission`, `missionSubmission`, etc.).

## Troubleshooting
- Commands not appearing: Re-run `node deploy-commands.js`, ensure `clientId/guildId` are correct and the bot is in that guild.
- Missing `#market`, `#bag`, or `#log` channels: Create the channels so corresponding boards/logs can post/update.
- Team roles not assigned: Verify invite URLs in `domain/events/guildMemberAdd.js` match live invites and that the bot can manage the team roles.
- Mission submissions rejected: Check that attachments match the required document types and that all participants have the correct team roles.
- Mongo errors: Start MongoDB locally or update the URI in `database/db.js` and ensure network access.
- Permission issues: Owner-only commands check against a hardcoded `OWNER_ID` in admin commands. Update it to your Discord user ID if needed.

## Notes
- Adjust allowed document types for missions in `database/models/mission.js` if you need additional file formats.
- Update `TEAM_ROLE_NAMES` and invite mappings if your server uses different team naming.
- Some responses are ephemeral and visible only to the invoking user.
