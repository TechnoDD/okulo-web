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
  .setEndpoint("https://api.virtualfactory.it/v1")
  .setProject("69713052000a9e98a270"); // Replace with your project ID

export const account = new Account(client);
export const storage = new Storage(client);
export const tablesDB = new TablesDB(client);
export { ID, Query, Permission, Role };
export type { Models };
