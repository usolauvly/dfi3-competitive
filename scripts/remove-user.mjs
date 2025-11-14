#!/usr/bin/env node
import process from "node:process";
import { getUsers, saveUsers } from "../api/_lib/users.js";
import { readState, writeState } from "../api/_lib/store.js";

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("Usage: npm run remove-user -- <username>");
    process.exit(1);
  }

  const users = await getUsers();
  const target = users.find((user) => user.username.toLowerCase() === username.toLowerCase());

  if (!target) {
    console.error(`No account found for username "${username}".`);
    process.exit(1);
  }

  const nextUsers = users.filter((user) => user.id !== target.id);
  await saveUsers(nextUsers);

  const state = await readState();
  if (state[target.personId]) {
    delete state[target.personId];
    await writeState(state);
  }

  console.log(`Removed account "${target.username}" (personId: ${target.personId}).`);
}

main().catch((error) => {
  console.error("Failed to remove account:", error);
  process.exit(1);
});
