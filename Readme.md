# GoogleDriveMover

Moves File Ownerships from one Google Drive User to another Google Drive User

## Usage

Configure [Google API Access](https://console.cloud.google.com/apis/dashboard) on [this Website](https://console.cloud.google.com/apis/dashboard) and place the `oauth2.keys.json` (Credentails -> OAuth 2.0 -> Download Client) in the root of this repository.

```bash
bun install
bun run start -n newOwnerEmail -o oldOwnerEmail
```

A Browser Window will open and ask for permissions to access the Google Drive API, first for the new owner, then for the old owner. After that the script will run and move all files from the oldOwner to the newOwner.
