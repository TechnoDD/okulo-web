import {
  Client,
  Account,
  ID,
  Models,
  Storage,
  Query,
  Permission,
  Role,
  TablesDB,
} from "appwrite";

export const client = new Client();

client
  .setEndpoint("https://appwrite180.vps.technodesign.it/v1")
  .setProject("693952c90020d2e1d87c"); // Replace with your project ID

export const account = new Account(client);
export const storage = new Storage(client);
export const tablesDB = new TablesDB(client);
export { ID, Query, Permission, Role };
export type { Models };
