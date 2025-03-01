import { drive_v2, drive_v3 } from "googleapis";
import { clientManager } from "OAuth2ClientManager";
import { server } from "server";
import arg from "arg";
import { GaxiosPromise } from "googleapis/build/src/apis/drive";

const args = arg({
  // Types
  "--help": Boolean,
  "--version": Boolean,
  "--verbose": arg.COUNT, // Counts the number of times --verbose is passed

  "--oldOwner": String, // --oldOwner <string> or --oldOwner=<string>
  "--newOwner": String, // --newOwner <string> or --newOwner=<string>
  "--maxNextPage": Number, // --maxNextPage <number> or --maxNextPage=<number>
  "--skipOldOwner": Boolean, // --skipOldOwner
  // Aliases
  "-o": "--oldOwner", // -o <string>; result is stored in --oldOwner
  "-n": "--newOwner", // -n <string>; result is stored in --newOwner
  "-m": "--maxNextPage", // -m <number>; result is stored in --maxNextPage
  "-s": "--skipOldOwner", // -s; result is stored in --skipOldOwner
  "-h": "--help",
  "-v": "--version",
  "-V": "--verbose",
});

if (!args["--oldOwner"])
  throw new Error("missing required argument: --oldOwner");
if (!args["--newOwner"])
  throw new Error("missing required argument: --newOwner");
const oldOwner = args["--oldOwner"];
const newOwner = args["--newOwner"];
const maxNextPage = args["--maxNextPage"] || 1;
let nextPageCount = 0;

console.log(`Transferring ownership from ${oldOwner} to ${newOwner}`);

// Create a client for the target account
const targetClient = await clientManager.createClient(newOwner);
const targetV3 = new drive_v3.Drive({ auth: targetClient });
const targetV2 = new drive_v2.Drive({ auth: targetClient });

if (!args["--skipOldOwner"]) {
  // Create a client for the source
  const sourceClient = await clientManager.createClient(oldOwner);
  const sourceV3 = new drive_v3.Drive({ auth: sourceClient });
  const sourceV2 = new drive_v2.Drive({ auth: sourceClient });

  let options = {
    q: "'me' in owners and mimeType != 'application/vnd.google-apps.shortcut'",
    fields: "nextPageToken,files(id)",
    orderBy: "modifiedTime desc",
    pageSize: 50,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  };
  let ownerSourceFiles = await sourceV3.files.list(options);

  do {
    if (nextPageCount++ >= maxNextPage || !ownerSourceFiles.data.files) break;
    console.log(
      `Transferring ownership of ${ownerSourceFiles.data.files.length} files on page ${nextPageCount} from source to target account`
    );
    let promises: GaxiosPromise<drive_v2.Schema$Permission>[] = [];
    for (let file of ownerSourceFiles.data.files) {
      if (!file.id) continue;
      promises.push(
        sourceV2.permissions.insert({
          fileId: file.id,
          supportsAllDrives: true,
          moveToNewOwnersRoot: false,
          sendNotificationEmails: false,
          requestBody: {
            role: "writer",
            type: "user",
            value: newOwner,
            pendingOwner: true,
          },
        })
      );
    }
    try {
      await Promise.all(promises);
      console.log("Waiting 2,5 seconds for quota to reset");
      await new Promise((resolve) => setTimeout(resolve, 2500));
    } catch (error) {
      console.log(error);
    }
    if (!ownerSourceFiles.data.nextPageToken) break;
    ownerSourceFiles = await sourceV3.files.list({
      ...options,
      pageToken: ownerSourceFiles.data.nextPageToken,
    });
  } while (ownerSourceFiles.data.nextPageToken);

  console.log("Waiting 30 seconds for permissions to propagate");
  await new Promise((resolve) => setTimeout(resolve, 30000));
}

// In order to get all files owned by the old owner allowed to transfer, we need to select files with the canAcceptOwnership capability
let targetOptions = {
  q: `'${oldOwner}' in owners and mimeType != 'application/vnd.google-apps.shortcut'`,
  fields: "nextPageToken,files(id,capabilities/canAcceptOwnership)",
  pageSize: 50,
};
let targetFiles = await targetV3.files.list(targetOptions);
nextPageCount = 0;

console.log("Accepting ownership of files at target account");
do {
  if (nextPageCount++ >= maxNextPage || !targetFiles.data.files) break;
  console.log(
    `Accepting ownership of ${targetFiles.data.files.length} files on page ${nextPageCount} at target account`
  );
  let promises: GaxiosPromise<drive_v2.Schema$Permission>[] = [];
  for (let file of targetFiles.data.files) {
    if (!file.id) continue;
    promises.push(
      targetV2.permissions.insert({
        fileId: file.id,
        supportsAllDrives: true,
        moveToNewOwnersRoot: false,
        sendNotificationEmails: false,
        requestBody: { role: "owner", type: "user", value: newOwner },
      })
    );
  }

  try {
    await Promise.all(promises);
  } catch (error) {
    console.log(error);
  }
  if (!targetFiles.data.nextPageToken) break;
  targetFiles = await targetV3.files.list({
    ...targetOptions,
    pageToken: targetFiles.data.nextPageToken,
  });
} while (targetFiles.data.nextPageToken);

server.close();
