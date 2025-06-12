#!/usr/bin/env node

import React from "react";
import { render } from "ink";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { App } from "./App.js";
import {
  LootTier,
  ItemType,
  WeaponSubType,
  ArmorSubType,
  AccessorySubType,
  ConsumableSubType,
  MaterialSubType,
} from "./types.js";

const cli = yargs(hideBin(process.argv))
  .scriptName("ai-loot")
  .usage("$0 <command> [options]")
  .command("generate [options]", "Generate loot items using AI", (yargs) => {
    return yargs
      .option("tier", {
        alias: "t",
        type: "string",
        choices: Object.values(LootTier),
        default: LootTier.BRONZE,
        description: "Loot tier to generate",
      })
      .option("count", {
        alias: "c",
        type: "number",
        default: 1,
        description: "Number of items to generate",
      })
      .option("type", {
        type: "string",
        choices: Object.values(ItemType),
        description: "Type of item to generate",
      })
      .option("subtype", {
        type: "string",
        choices: [
          ...Object.values(WeaponSubType),
          ...Object.values(ArmorSubType),
          ...Object.values(AccessorySubType),
          ...Object.values(ConsumableSubType),
          ...Object.values(MaterialSubType),
        ],
        description: "Specific subtype to generate (e.g., Sword, Helmet, Ring)",
      })
      .option("set", {
        alias: "s",
        type: "string",
        description: "Generate items for a specific set",
      })
      .option("model", {
        alias: "m",
        type: "string",
        default: "llama3.1",
        description: "Ollama model to use",
      });
  })
  .command("list [options]", "List generated loot items", (yargs) => {
    return yargs
      .option("tier", {
        alias: "t",
        type: "string",
        choices: Object.values(LootTier),
        description: "Filter by tier",
      })
      .option("limit", {
        alias: "l",
        type: "number",
        default: 20,
        description: "Maximum number of items to display",
      });
  })
  .command("stats", "Show database statistics", () => {})
  .command("models", "List available Ollama models", () => {})
  .demandCommand(1, "You must specify a command")
  .help()
  .alias("help", "h")
  .version("1.0.0")
  .alias("version", "v");

const args = cli.parseSync();
const command = args._[0] as string;

// Map CLI args to App props
const appProps = {
  command,
  tier: args.tier as LootTier,
  count: args.count as number,
  itemType: args.type as ItemType,
  subType: args.subtype as string,
  setName: args.set as string,
  model: args.model as string,
  list: command === "list",
  stats: command === "stats",
};

// Render the React app
render(<App {...appProps} />);
