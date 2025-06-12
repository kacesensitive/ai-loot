import { z } from "zod";

export enum LootTier {
  BRONZE = "Bronze",
  SILVER = "Silver",
  GOLD = "Gold",
  PLATINUM = "Platinum",
  LEGENDARY = "Legendary",
  CELESTIAL = "Celestial",
}

export enum ItemType {
  WEAPON = "Weapon",
  ARMOR = "Armor",
  ACCESSORY = "Accessory",
  CONSUMABLE = "Consumable",
  MATERIAL = "Material",
  RUNE = "Rune",
  ARTIFACT = "Artifact",
}

export enum WeaponSubType {
  SWORD = "Sword",
  AXE = "Axe",
  MACE = "Mace",
  DAGGER = "Dagger",
  BOW = "Bow",
  CROSSBOW = "Crossbow",
  STAFF = "Staff",
  WAND = "Wand",
  SPEAR = "Spear",
  HAMMER = "Hammer",
  SHIELD = "Shield",
}

export enum ArmorSubType {
  HELMET = "Helmet",
  CHESTPIECE = "Chestpiece",
  LEGGINGS = "Leggings",
  BOOTS = "Boots",
  GLOVES = "Gloves",
  CLOAK = "Cloak",
  GREAVES = "Greaves",
  PAULDRONS = "Pauldrons",
  BRACERS = "Bracers",
}

export enum AccessorySubType {
  RING = "Ring",
  AMULET = "Amulet",
  EARRINGS = "Earrings",
  BROOCH = "Brooch",
  PENDANT = "Pendant",
}

export enum ConsumableSubType {
  POTION = "Potion",
  SCROLL = "Scroll",
  FOOD = "Food",
  ELIXIR = "Elixir",
  TOME = "Tome",
}

export enum MaterialSubType {
  ORE = "Ore",
  GEM = "Gem",
  ESSENCE = "Essence",
  CRYSTAL = "Crystal",
  HERB = "Herb",
}

// Base stats that all items can have
export const BaseStatsSchema = z.object({
  durability: z.number().optional(),
  weight: z.number().optional(),
  value: z.number().optional(),
});

// Weapon-specific stats
export const WeaponStatsSchema = BaseStatsSchema.extend({
  damage: z.number(),
  attackSpeed: z.number().optional(),
  criticalChance: z.number().optional(),
  criticalDamage: z.number().optional(),
  range: z.number().optional(),
  accuracy: z.number().optional(),
});

// Armor-specific stats
export const ArmorStatsSchema = BaseStatsSchema.extend({
  defense: z.number(),
  magicResistance: z.number().optional(),
  elementalResistance: z
    .object({
      fire: z.number().optional(),
      ice: z.number().optional(),
      lightning: z.number().optional(),
      poison: z.number().optional(),
      dark: z.number().optional(),
      light: z.number().optional(),
    })
    .optional(),
});

// Accessory-specific stats
export const AccessoryStatsSchema = BaseStatsSchema.extend({
  health: z.number().optional(),
  mana: z.number().optional(),
  stamina: z.number().optional(),
  strength: z.number().optional(),
  dexterity: z.number().optional(),
  intelligence: z.number().optional(),
  wisdom: z.number().optional(),
  constitution: z.number().optional(),
  luck: z.number().optional(),
});

// Consumable-specific stats
export const ConsumableStatsSchema = BaseStatsSchema.extend({
  healingPower: z.number().optional(),
  manaPower: z.number().optional(),
  duration: z.number().optional(),
  stackSize: z.number().optional(),
});

// Material-specific stats
export const MaterialStatsSchema = BaseStatsSchema.extend({
  purity: z.number().optional(),
  stackSize: z.number().optional(),
  craftingBonus: z.number().optional(),
});

// Union type for all possible stats
export const ItemStatsSchema = z.union([
  WeaponStatsSchema,
  ArmorStatsSchema,
  AccessoryStatsSchema,
  ConsumableStatsSchema,
  MaterialStatsSchema,
]);

// Magical properties/enchantments
export const MagicalPropertySchema = z.object({
  name: z.string(),
  description: z.string(),
  magnitude: z.number().optional(),
});

export const LootItemSchema = z.object({
  name: z.string(),
  type: z.nativeEnum(ItemType),
  subType: z.union([
    z.nativeEnum(WeaponSubType),
    z.nativeEnum(ArmorSubType),
    z.nativeEnum(AccessorySubType),
    z.nativeEnum(ConsumableSubType),
    z.nativeEnum(MaterialSubType),
    z.string(), // For RUNE and ARTIFACT which don't have predefined subtypes
  ]),
  tier: z.nativeEnum(LootTier),
  description: z.string(),
  stats: ItemStatsSchema,
  magicalProperties: z.array(MagicalPropertySchema).optional(),
  lore: z.string().optional(),
  setName: z.string().optional(),
  rarity: z.number().min(0).max(100),
});

export type LootItem = z.infer<typeof LootItemSchema>;
export type WeaponStats = z.infer<typeof WeaponStatsSchema>;
export type ArmorStats = z.infer<typeof ArmorStatsSchema>;
export type AccessoryStats = z.infer<typeof AccessoryStatsSchema>;
export type ConsumableStats = z.infer<typeof ConsumableStatsSchema>;
export type MaterialStats = z.infer<typeof MaterialStatsSchema>;
export type MagicalProperty = z.infer<typeof MagicalPropertySchema>;

export interface DatabaseItem extends LootItem {
  id: number;
  createdAt: string;
  hash: string;
}

export interface LootSet {
  id: number;
  name: string;
  description: string;
  tier: LootTier;
  items: DatabaseItem[];
  createdAt: string;
}

export interface GenerationOptions {
  tier: LootTier;
  count: number;
  itemType?: ItemType;
  subType?:
    | WeaponSubType
    | ArmorSubType
    | AccessorySubType
    | ConsumableSubType
    | MaterialSubType
    | string;
  setName?: string;
  model?: string;
}
