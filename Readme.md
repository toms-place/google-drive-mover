# GoogleDriveMover

Moves File Ownerships from one Google Drive User to another Google Drive User

## Usage

Configure [Google API Access](https://console.cloud.google.com/apis/dashboard) on [this Website](https://console.cloud.google.com/apis/dashboard) and place the `oauth2.keys.json` (Credentails -> OAuth 2.0 -> Download Client) in the root of this repository.

```bash
bun install
bun run start -n newOwnerEmail -o oldOwnerEmail
```
