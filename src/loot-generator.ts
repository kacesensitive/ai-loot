import ollama from "ollama";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import {
  LootItemSchema,
  LootItem,
  LootTier,
  ItemType,
  WeaponSubType,
  ArmorSubType,
  AccessorySubType,
  ConsumableSubType,
  MaterialSubType,
  GenerationOptions,
} from "./types.js";
import { LootDatabase } from "./database.js";

// Simplified schema for AI generation
const SimplifiedLootItemSchema = z.object({
  name: z.string(),
  type: z.string(),
  subType: z.string(),
  tier: z.string(),
  description: z.string(),
  stats: z.record(z.number()),
  magicalProperties: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        magnitude: z.number().optional(),
      })
    )
    .optional(),
  lore: z.string().optional(),
  setName: z.string().optional(),
  rarity: z.number(),
});

export class LootGenerator {
  private db: LootDatabase;
  private defaultModel: string;

  constructor(db: LootDatabase, defaultModel: string = "llama3.1") {
    this.db = db;
    this.defaultModel = defaultModel;
  }

  private getTierMultiplier(tier: LootTier): number {
    const multipliers = {
      [LootTier.BRONZE]: 1,
      [LootTier.SILVER]: 1.5,
      [LootTier.GOLD]: 2,
      [LootTier.PLATINUM]: 3,
      [LootTier.LEGENDARY]: 5,
      [LootTier.CELESTIAL]: 10,
    };
    return multipliers[tier];
  }

  private getWeaponStatRanges(tier: LootTier) {
    const ranges = {
      [LootTier.BRONZE]: {
        damage: { min: 8, max: 15 },
        attackSpeed: { min: -10, max: 10 },
        criticalChance: { min: 2, max: 6 },
        criticalDamage: { min: 150, max: 180 },
        range: { min: 1, max: 3 },
        accuracy: { min: -5, max: 5 },
        durability: { min: 50, max: 100 },
        weight: { min: 1.0, max: 4.0 },
        value: { min: 50, max: 150 },
      },
      [LootTier.SILVER]: {
        damage: { min: 12, max: 22 },
        attackSpeed: { min: -5, max: 20 },
        criticalChance: { min: 4, max: 10 },
        criticalDamage: { min: 160, max: 200 },
        range: { min: 1, max: 4 },
        accuracy: { min: -3, max: 8 },
        durability: { min: 80, max: 140 },
        weight: { min: 0.8, max: 4.5 },
        value: { min: 100, max: 300 },
      },
      [LootTier.GOLD]: {
        damage: { min: 18, max: 35 },
        attackSpeed: { min: 0, max: 30 },
        criticalChance: { min: 6, max: 15 },
        criticalDamage: { min: 180, max: 230 },
        range: { min: 1, max: 5 },
        accuracy: { min: 0, max: 12 },
        durability: { min: 120, max: 200 },
        weight: { min: 0.6, max: 5.0 },
        value: { min: 200, max: 600 },
      },
      [LootTier.PLATINUM]: {
        damage: { min: 30, max: 55 },
        attackSpeed: { min: 5, max: 45 },
        criticalChance: { min: 10, max: 22 },
        criticalDamage: { min: 200, max: 280 },
        range: { min: 2, max: 7 },
        accuracy: { min: 5, max: 18 },
        durability: { min: 180, max: 280 },
        weight: { min: 0.4, max: 6.0 },
        value: { min: 400, max: 1200 },
      },
      [LootTier.LEGENDARY]: {
        damage: { min: 45, max: 85 },
        attackSpeed: { min: 15, max: 65 },
        criticalChance: { min: 18, max: 35 },
        criticalDamage: { min: 250, max: 350 },
        range: { min: 3, max: 10 },
        accuracy: { min: 10, max: 25 },
        durability: { min: 250, max: 400 },
        weight: { min: 0.3, max: 7.0 },
        value: { min: 800, max: 2500 },
      },
      [LootTier.CELESTIAL]: {
        damage: { min: 75, max: 150 },
        attackSpeed: { min: 30, max: 100 },
        criticalChance: { min: 25, max: 50 },
        criticalDamage: { min: 300, max: 500 },
        range: { min: 5, max: 15 },
        accuracy: { min: 20, max: 40 },
        durability: { min: 350, max: 600 },
        weight: { min: 0.2, max: 8.0 },
        value: { min: 1500, max: 5000 },
      },
    };
    return ranges[tier];
  }

  private getArmorStatRanges(tier: LootTier) {
    const ranges = {
      [LootTier.BRONZE]: {
        defense: { min: 3, max: 8 },
        magicResistance: { min: 2, max: 8 },
        elementalResistance: { min: 1, max: 5 },
        durability: { min: 60, max: 120 },
        weight: { min: 2.0, max: 15.0 },
        value: { min: 40, max: 120 },
      },
      [LootTier.SILVER]: {
        defense: { min: 6, max: 15 },
        magicResistance: { min: 5, max: 12 },
        elementalResistance: { min: 3, max: 8 },
        durability: { min: 100, max: 180 },
        weight: { min: 1.8, max: 16.0 },
        value: { min: 80, max: 250 },
      },
      [LootTier.GOLD]: {
        defense: { min: 12, max: 25 },
        magicResistance: { min: 8, max: 18 },
        elementalResistance: { min: 5, max: 12 },
        durability: { min: 150, max: 250 },
        weight: { min: 1.5, max: 18.0 },
        value: { min: 150, max: 500 },
      },
      [LootTier.PLATINUM]: {
        defense: { min: 20, max: 40 },
        magicResistance: { min: 15, max: 28 },
        elementalResistance: { min: 8, max: 18 },
        durability: { min: 220, max: 350 },
        weight: { min: 1.2, max: 20.0 },
        value: { min: 300, max: 1000 },
      },
      [LootTier.LEGENDARY]: {
        defense: { min: 35, max: 65 },
        magicResistance: { min: 25, max: 45 },
        elementalResistance: { min: 15, max: 30 },
        durability: { min: 300, max: 500 },
        weight: { min: 1.0, max: 25.0 },
        value: { min: 600, max: 2000 },
      },
      [LootTier.CELESTIAL]: {
        defense: { min: 55, max: 120 },
        magicResistance: { min: 40, max: 80 },
        elementalResistance: { min: 25, max: 50 },
        durability: { min: 450, max: 800 },
        weight: { min: 0.8, max: 30.0 },
        value: { min: 1200, max: 4000 },
      },
    };
    return ranges[tier];
  }

  private getAccessoryStatRanges(tier: LootTier) {
    const ranges = {
      [LootTier.BRONZE]: {
        health: { min: 10, max: 30 },
        mana: { min: 8, max: 25 },
        stamina: { min: 5, max: 15 },
        attributes: { min: 1, max: 2 },
        luck: { min: 1, max: 3 },
        durability: { min: 30, max: 80 },
        weight: { min: 0.1, max: 1.0 },
        value: { min: 80, max: 200 },
      },
      [LootTier.SILVER]: {
        health: { min: 25, max: 50 },
        mana: { min: 20, max: 40 },
        stamina: { min: 12, max: 25 },
        attributes: { min: 1, max: 3 },
        luck: { min: 2, max: 5 },
        durability: { min: 60, max: 120 },
        weight: { min: 0.1, max: 1.2 },
        value: { min: 150, max: 400 },
      },
      [LootTier.GOLD]: {
        health: { min: 40, max: 80 },
        mana: { min: 35, max: 65 },
        stamina: { min: 20, max: 40 },
        attributes: { min: 2, max: 4 },
        luck: { min: 3, max: 7 },
        durability: { min: 100, max: 180 },
        weight: { min: 0.1, max: 1.5 },
        value: { min: 300, max: 800 },
      },
      [LootTier.PLATINUM]: {
        health: { min: 70, max: 130 },
        mana: { min: 60, max: 100 },
        stamina: { min: 35, max: 65 },
        attributes: { min: 3, max: 6 },
        luck: { min: 5, max: 10 },
        durability: { min: 150, max: 250 },
        weight: { min: 0.1, max: 2.0 },
        value: { min: 600, max: 1500 },
      },
      [LootTier.LEGENDARY]: {
        health: { min: 120, max: 220 },
        mana: { min: 100, max: 180 },
        stamina: { min: 60, max: 110 },
        attributes: { min: 5, max: 10 },
        luck: { min: 8, max: 15 },
        durability: { min: 220, max: 350 },
        weight: { min: 0.1, max: 2.5 },
        value: { min: 1200, max: 3000 },
      },
      [LootTier.CELESTIAL]: {
        health: { min: 200, max: 400 },
        mana: { min: 180, max: 350 },
        stamina: { min: 100, max: 200 },
        attributes: { min: 8, max: 20 },
        luck: { min: 12, max: 25 },
        durability: { min: 300, max: 500 },
        weight: { min: 0.1, max: 3.0 },
        value: { min: 2500, max: 6000 },
      },
    };
    return ranges[tier];
  }

  private getConsumableStatRanges(tier: LootTier) {
    const ranges = {
      [LootTier.BRONZE]: {
        healingPower: { min: 25, max: 60 },
        manaPower: { min: 15, max: 40 },
        duration: { min: 30, max: 120 },
        stackSize: { min: 10, max: 50 },
        value: { min: 5, max: 25 },
      },
      [LootTier.SILVER]: {
        healingPower: { min: 50, max: 100 },
        manaPower: { min: 35, max: 75 },
        duration: { min: 60, max: 180 },
        stackSize: { min: 15, max: 75 },
        value: { min: 15, max: 50 },
      },
      [LootTier.GOLD]: {
        healingPower: { min: 85, max: 160 },
        manaPower: { min: 65, max: 120 },
        duration: { min: 120, max: 300 },
        stackSize: { min: 20, max: 99 },
        value: { min: 30, max: 100 },
      },
      [LootTier.PLATINUM]: {
        healingPower: { min: 140, max: 250 },
        manaPower: { min: 110, max: 200 },
        duration: { min: 180, max: 450 },
        stackSize: { min: 25, max: 99 },
        value: { min: 60, max: 200 },
      },
      [LootTier.LEGENDARY]: {
        healingPower: { min: 220, max: 400 },
        manaPower: { min: 180, max: 350 },
        duration: { min: 300, max: 600 },
        stackSize: { min: 30, max: 99 },
        value: { min: 120, max: 400 },
      },
      [LootTier.CELESTIAL]: {
        healingPower: { min: 350, max: 750 },
        manaPower: { min: 300, max: 600 },
        duration: { min: 450, max: 900 },
        stackSize: { min: 50, max: 99 },
        value: { min: 250, max: 800 },
      },
    };
    return ranges[tier];
  }

  private getMaterialStatRanges(tier: LootTier) {
    const ranges = {
      [LootTier.BRONZE]: {
        purity: { min: 60, max: 75 },
        stackSize: { min: 50, max: 200 },
        craftingBonus: { min: 2, max: 8 },
        value: { min: 2, max: 10 },
      },
      [LootTier.SILVER]: {
        purity: { min: 70, max: 82 },
        stackSize: { min: 100, max: 300 },
        craftingBonus: { min: 5, max: 12 },
        value: { min: 5, max: 20 },
      },
      [LootTier.GOLD]: {
        purity: { min: 78, max: 88 },
        stackSize: { min: 150, max: 500 },
        craftingBonus: { min: 8, max: 18 },
        value: { min: 10, max: 40 },
      },
      [LootTier.PLATINUM]: {
        purity: { min: 85, max: 93 },
        stackSize: { min: 200, max: 750 },
        craftingBonus: { min: 12, max: 25 },
        value: { min: 20, max: 80 },
      },
      [LootTier.LEGENDARY]: {
        purity: { min: 90, max: 97 },
        stackSize: { min: 300, max: 999 },
        craftingBonus: { min: 20, max: 35 },
        value: { min: 40, max: 150 },
      },
      [LootTier.CELESTIAL]: {
        purity: { min: 95, max: 99 },
        stackSize: { min: 500, max: 999 },
        craftingBonus: { min: 30, max: 50 },
        value: { min: 80, max: 300 },
      },
    };
    return ranges[tier];
  }

  private randomInRange(range: { min: number; max: number }): number {
    return (
      Math.round((Math.random() * (range.max - range.min) + range.min) * 100) /
      100
    );
  }

  private generateStatsForType(
    itemType: ItemType,
    tier: LootTier
  ): Record<string, number> {
    switch (itemType) {
      case ItemType.WEAPON:
        const weaponRanges = this.getWeaponStatRanges(tier);
        return {
          damage: Math.round(this.randomInRange(weaponRanges.damage)),
          attackSpeed: Math.round(this.randomInRange(weaponRanges.attackSpeed)),
          criticalChance: Math.round(
            this.randomInRange(weaponRanges.criticalChance)
          ),
          criticalDamage: Math.round(
            this.randomInRange(weaponRanges.criticalDamage)
          ),
          range: this.randomInRange(weaponRanges.range),
          accuracy: Math.round(this.randomInRange(weaponRanges.accuracy)),
          durability: Math.round(this.randomInRange(weaponRanges.durability)),
          weight: this.randomInRange(weaponRanges.weight),
          value: Math.round(this.randomInRange(weaponRanges.value)),
        };

      case ItemType.ARMOR:
        const armorRanges = this.getArmorStatRanges(tier);
        return {
          defense: Math.round(this.randomInRange(armorRanges.defense)),
          magicResistance: Math.round(
            this.randomInRange(armorRanges.magicResistance)
          ),
          fireResistance: Math.round(
            this.randomInRange(armorRanges.elementalResistance)
          ),
          iceResistance: Math.round(
            this.randomInRange(armorRanges.elementalResistance)
          ),
          lightningResistance: Math.round(
            this.randomInRange(armorRanges.elementalResistance)
          ),
          poisonResistance: Math.round(
            this.randomInRange(armorRanges.elementalResistance)
          ),
          durability: Math.round(this.randomInRange(armorRanges.durability)),
          weight: this.randomInRange(armorRanges.weight),
          value: Math.round(this.randomInRange(armorRanges.value)),
        };

      case ItemType.ACCESSORY:
        const accessoryRanges = this.getAccessoryStatRanges(tier);
        return {
          health: Math.round(this.randomInRange(accessoryRanges.health)),
          mana: Math.round(this.randomInRange(accessoryRanges.mana)),
          stamina: Math.round(this.randomInRange(accessoryRanges.stamina)),
          strength: Math.round(this.randomInRange(accessoryRanges.attributes)),
          dexterity: Math.round(this.randomInRange(accessoryRanges.attributes)),
          intelligence: Math.round(
            this.randomInRange(accessoryRanges.attributes)
          ),
          wisdom: Math.round(this.randomInRange(accessoryRanges.attributes)),
          constitution: Math.round(
            this.randomInRange(accessoryRanges.attributes)
          ),
          luck: Math.round(this.randomInRange(accessoryRanges.luck)),
          durability: Math.round(
            this.randomInRange(accessoryRanges.durability)
          ),
          weight: this.randomInRange(accessoryRanges.weight),
          value: Math.round(this.randomInRange(accessoryRanges.value)),
        };

      case ItemType.CONSUMABLE:
        const consumableRanges = this.getConsumableStatRanges(tier);
        return {
          healingPower: Math.round(
            this.randomInRange(consumableRanges.healingPower)
          ),
          manaPower: Math.round(this.randomInRange(consumableRanges.manaPower)),
          duration: Math.round(this.randomInRange(consumableRanges.duration)),
          stackSize: Math.round(this.randomInRange(consumableRanges.stackSize)),
          value: Math.round(this.randomInRange(consumableRanges.value)),
        };

      case ItemType.MATERIAL:
        const materialRanges = this.getMaterialStatRanges(tier);
        return {
          purity: Math.round(this.randomInRange(materialRanges.purity)),
          stackSize: Math.round(this.randomInRange(materialRanges.stackSize)),
          craftingBonus: Math.round(
            this.randomInRange(materialRanges.craftingBonus)
          ),
          value: Math.round(this.randomInRange(materialRanges.value)),
        };

      default:
        return {
          durability: Math.round(this.randomInRange({ min: 50, max: 200 })),
          weight: this.randomInRange({ min: 0.5, max: 5.0 }),
          value: Math.round(this.randomInRange({ min: 50, max: 500 })),
        };
    }
  }

  private getRarityRange(tier: LootTier): { min: number; max: number } {
    const ranges = {
      [LootTier.BRONZE]: { min: 5, max: 25 },
      [LootTier.SILVER]: { min: 20, max: 40 },
      [LootTier.GOLD]: { min: 35, max: 60 },
      [LootTier.PLATINUM]: { min: 55, max: 75 },
      [LootTier.LEGENDARY]: { min: 70, max: 90 },
      [LootTier.CELESTIAL]: { min: 85, max: 100 },
    };
    return ranges[tier];
  }

  private getRandomSubType(itemType: ItemType): string {
    const subTypes = {
      [ItemType.WEAPON]: Object.values(WeaponSubType),
      [ItemType.ARMOR]: Object.values(ArmorSubType),
      [ItemType.ACCESSORY]: Object.values(AccessorySubType),
      [ItemType.CONSUMABLE]: Object.values(ConsumableSubType),
      [ItemType.MATERIAL]: Object.values(MaterialSubType),
      [ItemType.RUNE]: [
        "Lesser Rune",
        "Greater Rune",
        "Master Rune",
        "Divine Rune",
      ],
      [ItemType.ARTIFACT]: [
        "Ancient Relic",
        "Mystic Artifact",
        "Divine Artifact",
        "Primordial Remnant",
      ],
    };

    const options = subTypes[itemType];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generatePrompt(options: GenerationOptions): string {
    const { tier, itemType, setName } = options;
    const multiplier = this.getTierMultiplier(tier);
    const subType = options.subType || this.getRandomSubType(itemType!);

    let prompt = `You are a master loot generator for a fantasy RPG game. Generate a ${tier} tier ${subType} (${itemType})`;

    if (setName) {
      prompt += ` that belongs to the "${setName}" set`;
    }

    prompt += `.

TIER GUIDELINES:
- Bronze: Common items, basic materials, simple enchantments
- Silver: Uncommon items, minor magical properties, improved stats
- Gold: Rare items, moderate magical abilities, unique appearances
- Platinum: Very rare items, powerful enchantments, legendary craftsmanship
- Legendary: Extremely rare items, major magical powers, famous artifacts
- Celestial: Mythical items, divine powers, reality-altering abilities

The item should be appropriate for ${tier} tier (power level ${multiplier}x).

ITEM TYPE SPECIFIC REQUIREMENTS:

${this.getTypeSpecificRequirements(itemType!, subType, tier)}

${
  setName
    ? `Since this is part of the "${setName}" set, ensure it thematically fits with other items in that collection. `
    : ""
}

Create a detailed item with:
- A memorable and fitting name
- Rich description that captures its appearance and feel
- Appropriate stats for a ${subType} of ${tier} tier (as a flat object with numeric values)
- Compelling lore that tells its story or origin
- Magical properties should be structured with name, description, and optional magnitude

IMPORTANT: The stats field should be a flat object where keys are stat names and values are numbers. For example:
- Weapons: { "damage": 25, "attackSpeed": 10, "criticalChance": 8, "durability": 150, "weight": 2.5, "value": 800 }
- Armor: { "defense": 15, "magicResistance": 12, "fireResistance": 8, "durability": 200, "weight": 8.0, "value": 600 }

Be creative and imaginative. Make each item unique and exciting to discover!`;

    return prompt;
  }

  private getTypeSpecificRequirements(
    itemType: ItemType,
    subType: string,
    tier: LootTier
  ): string {
    switch (itemType) {
      case ItemType.WEAPON:
        const weaponRanges = this.getWeaponStatRanges(tier);
        return `WEAPON STATS REQUIRED (as flat numeric values):
- damage: Base damage (${weaponRanges.damage.min}-${weaponRanges.damage.max})
- attackSpeed: Attack speed modifier (${weaponRanges.attackSpeed.min} to ${weaponRanges.attackSpeed.max})
- criticalChance: Critical hit chance (${weaponRanges.criticalChance.min}-${weaponRanges.criticalChance.max})
- criticalDamage: Critical damage multiplier (${weaponRanges.criticalDamage.min}-${weaponRanges.criticalDamage.max})
- range: Weapon range in meters (${weaponRanges.range.min}-${weaponRanges.range.max})
- accuracy: Hit chance modifier (${weaponRanges.accuracy.min} to ${weaponRanges.accuracy.max})
- durability: Item durability (${weaponRanges.durability.min}-${weaponRanges.durability.max})
- weight: Weight in kg (${weaponRanges.weight.min}-${weaponRanges.weight.max})
- value: Gold value (${weaponRanges.value.min}-${weaponRanges.value.max})`;

      case ItemType.ARMOR:
        const armorRanges = this.getArmorStatRanges(tier);
        return `ARMOR STATS REQUIRED (as flat numeric values):
- defense: Armor rating (${armorRanges.defense.min}-${armorRanges.defense.max})
- magicResistance: Magic damage reduction (${armorRanges.magicResistance.min}-${armorRanges.magicResistance.max})
- fireResistance: Fire damage reduction (${armorRanges.elementalResistance.min}-${armorRanges.elementalResistance.max})
- iceResistance: Ice damage reduction (${armorRanges.elementalResistance.min}-${armorRanges.elementalResistance.max})
- lightningResistance: Lightning damage reduction (${armorRanges.elementalResistance.min}-${armorRanges.elementalResistance.max})
- poisonResistance: Poison damage reduction (${armorRanges.elementalResistance.min}-${armorRanges.elementalResistance.max})
- durability: Item durability (${armorRanges.durability.min}-${armorRanges.durability.max})
- weight: Weight in kg (${armorRanges.weight.min}-${armorRanges.weight.max})
- value: Gold value (${armorRanges.value.min}-${armorRanges.value.max})`;

      case ItemType.ACCESSORY:
        const accessoryRanges = this.getAccessoryStatRanges(tier);
        return `ACCESSORY STATS REQUIRED (as flat numeric values):
- health: Health bonus (${accessoryRanges.health.min}-${accessoryRanges.health.max})
- mana: Mana bonus (${accessoryRanges.mana.min}-${accessoryRanges.mana.max})
- stamina: Stamina bonus (${accessoryRanges.stamina.min}-${accessoryRanges.stamina.max})
- strength: Strength bonus (${accessoryRanges.attributes.min}-${accessoryRanges.attributes.max})
- dexterity: Dexterity bonus (${accessoryRanges.attributes.min}-${accessoryRanges.attributes.max})
- intelligence: Intelligence bonus (${accessoryRanges.attributes.min}-${accessoryRanges.attributes.max})
- wisdom: Wisdom bonus (${accessoryRanges.attributes.min}-${accessoryRanges.attributes.max})
- constitution: Constitution bonus (${accessoryRanges.attributes.min}-${accessoryRanges.attributes.max})
- luck: Luck bonus (${accessoryRanges.luck.min}-${accessoryRanges.luck.max})
- durability: Item durability (${accessoryRanges.durability.min}-${accessoryRanges.durability.max})
- weight: Weight in kg (${accessoryRanges.weight.min}-${accessoryRanges.weight.max})
- value: Gold value (${accessoryRanges.value.min}-${accessoryRanges.value.max})`;

      case ItemType.CONSUMABLE:
        const consumableRanges = this.getConsumableStatRanges(tier);
        return `CONSUMABLE STATS REQUIRED (as flat numeric values):
- healingPower: Health restored (${consumableRanges.healingPower.min}-${consumableRanges.healingPower.max})
- manaPower: Mana restored (${consumableRanges.manaPower.min}-${consumableRanges.manaPower.max})
- duration: Effect duration in seconds (${consumableRanges.duration.min}-${consumableRanges.duration.max})
- stackSize: Maximum stack size (${consumableRanges.stackSize.min}-${consumableRanges.stackSize.max})
- value: Gold value (${consumableRanges.value.min}-${consumableRanges.value.max})`;

      case ItemType.MATERIAL:
        const materialRanges = this.getMaterialStatRanges(tier);
        return `MATERIAL STATS REQUIRED (as flat numeric values):
- purity: Material purity percentage (${materialRanges.purity.min}-${materialRanges.purity.max})
- stackSize: Maximum stack size (${materialRanges.stackSize.min}-${materialRanges.stackSize.max})
- craftingBonus: Bonus to crafting success (${materialRanges.craftingBonus.min}-${materialRanges.craftingBonus.max})
- value: Gold value (${materialRanges.value.min}-${materialRanges.value.max})`;

      default:
        return `Generate appropriate stats for this item type with durability, weight, and value fields.`;
    }
  }

  private transformToStructuredStats(
    aiStats: Record<string, number>,
    itemType: ItemType,
    tier: LootTier
  ): any {
    // Generate baseline stats using our ranges
    const baselineStats = this.generateStatsForType(itemType, tier);

    // Merge AI-generated stats with baseline stats, preferring AI values when they exist
    const mergedStats = { ...baselineStats, ...aiStats };

    // Transform to structured stats based on item type
    switch (itemType) {
      case ItemType.WEAPON:
        return {
          damage: mergedStats.damage || baselineStats.damage,
          attackSpeed: mergedStats.attackSpeed,
          criticalChance: mergedStats.criticalChance,
          criticalDamage: mergedStats.criticalDamage,
          range: mergedStats.range,
          accuracy: mergedStats.accuracy,
          durability: mergedStats.durability,
          weight: mergedStats.weight,
          value: mergedStats.value,
        };

      case ItemType.ARMOR:
        return {
          defense: mergedStats.defense || baselineStats.defense,
          magicResistance: mergedStats.magicResistance,
          elementalResistance: {
            fire: mergedStats.fireResistance,
            ice: mergedStats.iceResistance,
            lightning: mergedStats.lightningResistance,
            poison: mergedStats.poisonResistance,
            dark: mergedStats.darkResistance,
            light: mergedStats.lightResistance,
          },
          durability: mergedStats.durability,
          weight: mergedStats.weight,
          value: mergedStats.value,
        };

      case ItemType.ACCESSORY:
        return {
          health: mergedStats.health,
          mana: mergedStats.mana,
          stamina: mergedStats.stamina,
          strength: mergedStats.strength,
          dexterity: mergedStats.dexterity,
          intelligence: mergedStats.intelligence,
          wisdom: mergedStats.wisdom,
          constitution: mergedStats.constitution,
          luck: mergedStats.luck,
          durability: mergedStats.durability,
          weight: mergedStats.weight,
          value: mergedStats.value,
        };

      case ItemType.CONSUMABLE:
        return {
          healingPower: mergedStats.healingPower,
          manaPower: mergedStats.manaPower,
          duration: mergedStats.duration,
          stackSize: mergedStats.stackSize,
          durability: mergedStats.durability,
          weight: mergedStats.weight,
          value: mergedStats.value,
        };

      case ItemType.MATERIAL:
        return {
          purity: mergedStats.purity,
          stackSize: mergedStats.stackSize,
          craftingBonus: mergedStats.craftingBonus,
          durability: mergedStats.durability,
          weight: mergedStats.weight,
          value: mergedStats.value,
        };

      default:
        return mergedStats;
    }
  }

  async generateLoot(options: GenerationOptions): Promise<LootItem[]> {
    const items: LootItem[] = [];
    const model = options.model || this.defaultModel;

    for (let i = 0; i < options.count; i++) {
      try {
        const prompt = this.generatePrompt(options);
        const schema = zodToJsonSchema(SimplifiedLootItemSchema);

        const response = await ollama.chat({
          model,
          messages: [{ role: "user", content: prompt }],
          format: schema,
          stream: false,
        });

        const generatedItem = JSON.parse(response.message.content);

        // Transform to structured format
        const structuredItem = {
          ...generatedItem,
          type: options.itemType || generatedItem.type,
          tier: options.tier,
          subType:
            options.subType ||
            generatedItem.subType ||
            this.getRandomSubType(options.itemType || generatedItem.type),
          stats: this.transformToStructuredStats(
            generatedItem.stats,
            options.itemType || generatedItem.type,
            options.tier
          ),
          rarity: Math.floor(
            Math.random() *
              (this.getRarityRange(options.tier).max -
                this.getRarityRange(options.tier).min +
                1) +
              this.getRarityRange(options.tier).min
          ),
        };

        // Set set name if specified
        if (options.setName) {
          structuredItem.setName = options.setName;
        }

        // Validate the item with the full schema
        const validatedItem = LootItemSchema.parse(structuredItem);
        items.push(validatedItem);
      } catch (error) {
        console.error(`Failed to generate item ${i + 1}:`, error);
        // Continue with next item
      }
    }

    return items;
  }

  async generateAndSaveLoot(
    options: GenerationOptions
  ): Promise<{ generated: LootItem[]; saved: number; duplicates: number }> {
    const generatedItems = await this.generateLoot(options);
    let saved = 0;
    let duplicates = 0;

    for (const item of generatedItems) {
      const initialCount = this.db.getAllItems().length;
      const savedItem = this.db.saveItem(item);
      const finalCount = this.db.getAllItems().length;

      if (savedItem) {
        // If the count increased, it's a new item; otherwise it's a duplicate
        if (finalCount > initialCount) {
          saved++;
        } else {
          duplicates++;
        }
      }
    }

    return {
      generated: generatedItems,
      saved,
      duplicates,
    };
  }

  async generateLootSet(
    setName: string,
    tier: LootTier,
    itemTypes: ItemType[],
    model?: string
  ): Promise<LootItem[]> {
    const setItems: LootItem[] = [];

    for (const itemType of itemTypes) {
      const options: GenerationOptions = {
        tier,
        count: 1,
        itemType,
        setName,
        model,
      };

      const items = await this.generateLoot(options);
      setItems.push(...items);
    }

    return setItems;
  }

  async testConnection(model?: string): Promise<boolean> {
    try {
      const testModel = model || this.defaultModel;
      await ollama.chat({
        model: testModel,
        messages: [{ role: "user", content: "Test connection" }],
        stream: false,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await ollama.list();
      return response.models.map((model) => model.name);
    } catch (error) {
      return [];
    }
  }
}
