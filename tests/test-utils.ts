import {
  LootItem,
  LootTier,
  ItemType,
  WeaponSubType,
  ArmorSubType,
  AccessorySubType,
  DatabaseItem,
} from "../src/types.js";
import { Ollama } from "ollama";

/**
 * Get a unique test database path
 */
export function getTestDbPath(): string {
  return `./test-db-${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}.sqlite`;
}

/**
 * Create a mock ollama response for testing
 */
export function createMockOllamaResponse(
  nameOrOptions: string | Partial<LootItem> = "Ironclad Blade",
  description: string = "A sturdy weapon forged in ancient fires.",
  lore: string = "Once wielded by legendary warriors."
) {
  // Handle both string name and object options
  if (typeof nameOrOptions === "object") {
    const options = nameOrOptions;
    return {
      message: {
        content: JSON.stringify({
          name: options.name || "Generated Item",
          description: options.description || "A generated item for testing.",
          lore: options.lore || "Created during test execution.",
          type: options.type || ItemType.WEAPON,
          subType: options.subType || WeaponSubType.SWORD,
          tier: options.tier || LootTier.BRONZE,
          stats: options.stats || { damage: 10, value: 100 },
          rarity: options.rarity || 20,
          magicalProperties: options.magicalProperties || [],
          setName: options.setName,
        }),
      },
    };
  } else {
    return {
      message: {
        content: JSON.stringify({
          name: nameOrOptions,
          description,
          lore,
        }),
      },
    };
  }
}

/**
 * Create mock database with proper behavior simulation
 */
export function createMockDatabase() {
  let items: DatabaseItem[] = [];
  let nextId = 1;

  return {
    exec: jest.fn(),
    prepare: jest.fn((sql: string) => {
      if (sql.includes("INSERT INTO items")) {
        return {
          run: jest.fn((...args: any[]) => {
            const [
              name,
              type,
              subType,
              tier,
              description,
              stats,
              magicalProperties,
              lore,
              setName,
              rarity,
              hash,
              createdAt,
            ] = args;

            // Check for existing item by hash
            const existing = items.find((item) => item.hash === hash);
            if (existing) {
              return { lastInsertRowid: existing.id };
            }

            const newItem: DatabaseItem = {
              id: nextId++,
              name,
              type,
              subType,
              tier,
              description,
              stats: typeof stats === "string" ? JSON.parse(stats) : stats,
              magicalProperties: magicalProperties
                ? typeof magicalProperties === "string"
                  ? JSON.parse(magicalProperties)
                  : magicalProperties
                : undefined,
              lore,
              rarity,
              setName,
              hash,
              createdAt,
            };
            items.push(newItem);
            return { lastInsertRowid: newItem.id };
          }),
        };
      }

      if (sql.includes("SELECT * FROM items WHERE id = ?")) {
        return {
          get: jest.fn((id: number) => {
            const item = items.find((item) => item.id === id);
            if (!item) return null;

            return {
              id: item.id,
              name: item.name,
              type: item.type,
              subType: item.subType,
              tier: item.tier,
              description: item.description,
              stats: JSON.stringify(item.stats),
              magicalProperties: item.magicalProperties
                ? JSON.stringify(item.magicalProperties)
                : null,
              lore: item.lore,
              rarity: item.rarity,
              setName: item.setName,
              hash: item.hash,
              createdAt: item.createdAt,
            };
          }),
        };
      }

      if (sql.includes("SELECT * FROM items WHERE hash = ?")) {
        return {
          get: jest.fn((hash: string) => {
            const item = items.find((item) => item.hash === hash);
            if (!item) return null;

            return {
              id: item.id,
              name: item.name,
              type: item.type,
              subType: item.subType,
              tier: item.tier,
              description: item.description,
              stats: JSON.stringify(item.stats),
              magicalProperties: item.magicalProperties
                ? JSON.stringify(item.magicalProperties)
                : null,
              lore: item.lore,
              rarity: item.rarity,
              setName: item.setName,
              hash: item.hash,
              createdAt: item.createdAt,
            };
          }),
        };
      }

      if (sql.includes("SELECT * FROM items WHERE tier = ?")) {
        return {
          all: jest.fn((tier: LootTier) => {
            return items
              .filter((item) => item.tier === tier)
              .map((item) => ({
                id: item.id,
                name: item.name,
                type: item.type,
                subType: item.subType,
                tier: item.tier,
                description: item.description,
                stats: JSON.stringify(item.stats),
                magicalProperties: item.magicalProperties
                  ? JSON.stringify(item.magicalProperties)
                  : null,
                lore: item.lore,
                rarity: item.rarity,
                setName: item.setName,
                hash: item.hash,
                createdAt: item.createdAt,
              }));
          }),
        };
      }

      if (sql.includes("SELECT * FROM items WHERE setName = ?")) {
        return {
          all: jest.fn((setName: string) => {
            return items
              .filter((item) => item.setName === setName)
              .map((item) => ({
                id: item.id,
                name: item.name,
                type: item.type,
                subType: item.subType,
                tier: item.tier,
                description: item.description,
                stats: JSON.stringify(item.stats),
                magicalProperties: item.magicalProperties
                  ? JSON.stringify(item.magicalProperties)
                  : null,
                lore: item.lore,
                rarity: item.rarity,
                setName: item.setName,
                hash: item.hash,
                createdAt: item.createdAt,
              }));
          }),
        };
      }

      if (sql.includes("SELECT * FROM items ORDER BY createdAt DESC LIMIT ?")) {
        return {
          all: jest.fn((limit: number) => {
            return items.slice(0, limit).map((item) => ({
              id: item.id,
              name: item.name,
              type: item.type,
              subType: item.subType,
              tier: item.tier,
              description: item.description,
              stats: JSON.stringify(item.stats),
              magicalProperties: item.magicalProperties
                ? JSON.stringify(item.magicalProperties)
                : null,
              lore: item.lore,
              rarity: item.rarity,
              setName: item.setName,
              hash: item.hash,
              createdAt: item.createdAt,
            }));
          }),
        };
      }

      if (sql.includes("SELECT * FROM items ORDER BY createdAt DESC")) {
        return {
          all: jest.fn(() => {
            return items.map((item) => ({
              id: item.id,
              name: item.name,
              type: item.type,
              subType: item.subType,
              tier: item.tier,
              description: item.description,
              stats: JSON.stringify(item.stats),
              magicalProperties: item.magicalProperties
                ? JSON.stringify(item.magicalProperties)
                : null,
              lore: item.lore,
              rarity: item.rarity,
              setName: item.setName,
              hash: item.hash,
              createdAt: item.createdAt,
            }));
          }),
        };
      }

      if (sql.includes("SELECT COUNT(*) as count FROM items WHERE tier = ?")) {
        return {
          get: jest.fn((tier: LootTier) => ({
            count: items.filter((item) => item.tier === tier).length,
          })),
        };
      }

      if (sql.includes("SELECT COUNT(*) as count FROM items")) {
        return {
          get: jest.fn(() => ({ count: items.length })),
        };
      }

      // Default fallback
      return {
        run: jest.fn(() => ({ lastInsertRowid: nextId++ })),
        get: jest.fn(() => null),
        all: jest.fn(() => []),
      };
    }),
    close: jest.fn(),
    // Helper methods for testing
    _reset: () => {
      items = [];
      nextId = 1;
    },
    _getItems: () => items,
  };
}

/**
 * Validate that stats are within expected ranges for a tier
 */
export function validateStatsInRange(
  stats: Record<string, number>,
  tier: LootTier,
  itemType: ItemType
): boolean {
  const multipliers = {
    [LootTier.BRONZE]: 1,
    [LootTier.SILVER]: 1.5,
    [LootTier.GOLD]: 2,
    [LootTier.PLATINUM]: 3,
    [LootTier.LEGENDARY]: 5,
    [LootTier.CELESTIAL]: 10,
  };

  const baseRanges = {
    [ItemType.WEAPON]: { min: 10, max: 50 },
    [ItemType.ARMOR]: { min: 5, max: 30 },
    [ItemType.ACCESSORY]: { min: 3, max: 20 },
    [ItemType.CONSUMABLE]: { min: 1, max: 15 },
    [ItemType.MATERIAL]: { min: 1, max: 10 },
  };

  const multiplier = multipliers[tier];
  const range = baseRanges[itemType];
  const expectedMin = range.min * multiplier;
  const expectedMax = range.max * multiplier;

  for (const value of Object.values(stats)) {
    if (value < expectedMin || value > expectedMax) {
      return false;
    }
  }

  return true;
}

/**
 * Sample items for testing
 */
export const SAMPLE_ITEMS: DatabaseItem[] = [
  {
    id: 1,
    name: "Bronze Sword",
    description: "A simple bronze sword",
    type: ItemType.WEAPON,
    subType: WeaponSubType.SWORD,
    tier: LootTier.BRONZE,
    stats: { damage: 15 },
    rarity: 80,
    lore: "Basic weapon",
    setName: undefined,
    hash: "hash1",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Silver Shield",
    description: "A sturdy silver shield",
    type: ItemType.ARMOR,
    subType: ArmorSubType.PAULDRONS,
    tier: LootTier.SILVER,
    stats: { defense: 25 },
    rarity: 60,
    lore: "Protective gear",
    setName: "Guardian Set",
    hash: "hash2",
    createdAt: "2024-01-01T00:00:00Z",
  },
];
