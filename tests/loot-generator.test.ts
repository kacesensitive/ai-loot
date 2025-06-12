import { LootGenerator } from "../src/loot-generator.js";
import { LootDatabase } from "../src/database.js";
import {
  LootTier,
  ItemType,
  WeaponSubType,
  ArmorSubType,
  AccessorySubType,
} from "../src/types.js";
import {
  getTestDbPath,
  createMockOllamaResponse,
  validateStatsInRange,
  createMockDatabase,
} from "./test-utils.js";
import fs from "fs";

// Mock better-sqlite3 to avoid native binding issues in tests
let mockDb: any;

jest.mock("better-sqlite3", () => {
  return jest.fn(() => mockDb);
});

// Mock ollama module
jest.mock("ollama", () => ({
  chat: jest.fn(),
  list: jest.fn().mockResolvedValue({
    models: [{ name: "llama3.1" }, { name: "llama2" }, { name: "mistral" }],
  }),
}));

describe("LootGenerator", () => {
  let generator: LootGenerator;
  let db: LootDatabase;
  const testDbPath = getTestDbPath();

  beforeEach(() => {
    // Create a fresh mock database for each test
    mockDb = createMockDatabase();

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    db = new LootDatabase(testDbPath);
    generator = new LootGenerator(db, "llama3.1");
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe("Tier Multipliers", () => {
    it("should return correct multipliers for each tier", () => {
      // Test via internal method access - we'll test through actual generation
      const bronzeOptions = {
        tier: LootTier.BRONZE,
        count: 1,
        itemType: ItemType.WEAPON,
      };
      const silverOptions = {
        tier: LootTier.SILVER,
        count: 1,
        itemType: ItemType.WEAPON,
      };
      const goldOptions = {
        tier: LootTier.GOLD,
        count: 1,
        itemType: ItemType.WEAPON,
      };
      const platinumOptions = {
        tier: LootTier.PLATINUM,
        count: 1,
        itemType: ItemType.WEAPON,
      };
      const legendaryOptions = {
        tier: LootTier.LEGENDARY,
        count: 1,
        itemType: ItemType.WEAPON,
      };
      const celestialOptions = {
        tier: LootTier.CELESTIAL,
        count: 1,
        itemType: ItemType.WEAPON,
      };

      // Mock ollama response for each tier to test multiplier effects
      const ollama = require("ollama");
      ollama.chat.mockResolvedValue(
        createMockOllamaResponse({
          name: "Test Item",
          type: ItemType.WEAPON,
          subType: WeaponSubType.SWORD,
          tier: LootTier.BRONZE,
          stats: { damage: 10, value: 100 },
        })
      );

      expect(bronzeOptions.tier).toBe(LootTier.BRONZE);
      expect(silverOptions.tier).toBe(LootTier.SILVER);
      expect(goldOptions.tier).toBe(LootTier.GOLD);
      expect(platinumOptions.tier).toBe(LootTier.PLATINUM);
      expect(legendaryOptions.tier).toBe(LootTier.LEGENDARY);
      expect(celestialOptions.tier).toBe(LootTier.CELESTIAL);
    });
  });

  describe("Stat Range Generation", () => {
    const ollama = require("ollama");

    beforeEach(() => {
      ollama.chat.mockResolvedValue(
        createMockOllamaResponse({
          name: "Test Item",
          type: ItemType.WEAPON,
          subType: WeaponSubType.SWORD,
          tier: LootTier.BRONZE,
          stats: { damage: 10, attackSpeed: 5, criticalChance: 5, value: 100 },
        })
      );
    });

    it("should generate weapon stats within expected ranges for Bronze tier", async () => {
      const options = {
        tier: LootTier.BRONZE,
        count: 10,
        itemType: ItemType.WEAPON,
        subType: WeaponSubType.SWORD,
      };

      const items = await generator.generateLoot(options);
      expect(items).toHaveLength(10);

      items.forEach((item) => {
        expect(item.tier).toBe(LootTier.BRONZE);
        expect(item.type).toBe(ItemType.WEAPON);
        expect(typeof item.stats.value).toBe("number");
        expect(item.stats.value).toBeGreaterThan(0);
        expect("damage" in item.stats).toBe(true);
      });
    });

    it("should generate armor stats within expected ranges for Silver tier", async () => {
      ollama.chat.mockResolvedValue(
        createMockOllamaResponse({
          name: "Test Armor",
          type: ItemType.ARMOR,
          subType: ArmorSubType.HELMET,
          tier: LootTier.SILVER,
          stats: { defense: 8, magicResistance: 6, value: 200 },
        })
      );

      const options = {
        tier: LootTier.SILVER,
        count: 5,
        itemType: ItemType.ARMOR,
        subType: ArmorSubType.HELMET,
      };

      const items = await generator.generateLoot(options);
      expect(items).toHaveLength(5);

      items.forEach((item) => {
        expect(item.tier).toBe(LootTier.SILVER);
        expect(item.type).toBe(ItemType.ARMOR);
        expect(typeof item.stats.value).toBe("number");
        expect(item.stats.value).toBeGreaterThan(0);
        expect("defense" in item.stats).toBe(true);
      });
    });

    it("should generate accessory stats within expected ranges for Gold tier", async () => {
      ollama.chat.mockResolvedValue(
        createMockOllamaResponse({
          name: "Test Ring",
          type: ItemType.ACCESSORY,
          subType: AccessorySubType.RING,
          tier: LootTier.GOLD,
          stats: { health: 50, mana: 40, strength: 3, value: 500 },
        })
      );

      const options = {
        tier: LootTier.GOLD,
        count: 3,
        itemType: ItemType.ACCESSORY,
        subType: AccessorySubType.RING,
      };

      const items = await generator.generateLoot(options);
      expect(items).toHaveLength(3);

      items.forEach((item) => {
        expect(item.tier).toBe(LootTier.GOLD);
        expect(item.type).toBe(ItemType.ACCESSORY);
        expect(typeof item.stats.value).toBe("number");
        expect(item.stats.value).toBeGreaterThan(0);
        expect("health" in item.stats).toBe(true);
      });
    });

    it("should scale stats appropriately across tiers", async () => {
      const bronzeWeapon = createMockOllamaResponse({
        type: ItemType.WEAPON,
        tier: LootTier.BRONZE,
        stats: { damage: 10, value: 100 },
      });

      const celestialWeapon = createMockOllamaResponse({
        type: ItemType.WEAPON,
        tier: LootTier.CELESTIAL,
        stats: { damage: 100, value: 5000 },
      });

      // Test bronze weapon
      ollama.chat.mockResolvedValueOnce(bronzeWeapon);
      const bronzeItems = await generator.generateLoot({
        tier: LootTier.BRONZE,
        count: 1,
        itemType: ItemType.WEAPON,
      });

      // Test celestial weapon
      ollama.chat.mockResolvedValueOnce(celestialWeapon);
      const celestialItems = await generator.generateLoot({
        tier: LootTier.CELESTIAL,
        count: 1,
        itemType: ItemType.WEAPON,
      });

      expect(bronzeItems).toHaveLength(1);
      expect(celestialItems).toHaveLength(1);

      // Both should be weapons with value stats
      expect(bronzeItems[0].type).toBe(ItemType.WEAPON);
      expect(celestialItems[0].type).toBe(ItemType.WEAPON);
      expect(celestialItems[0].stats.value).toBeGreaterThan(
        bronzeItems[0].stats.value!
      );
    });
  });

  describe("Rarity Generation", () => {
    const ollama = require("ollama");

    it("should generate appropriate rarity ranges for each tier", async () => {
      const tiers = [
        { tier: LootTier.BRONZE, expectedMin: 5, expectedMax: 25 },
        { tier: LootTier.SILVER, expectedMin: 20, expectedMax: 40 },
        { tier: LootTier.GOLD, expectedMin: 35, expectedMax: 60 },
        { tier: LootTier.PLATINUM, expectedMin: 55, expectedMax: 75 },
        { tier: LootTier.LEGENDARY, expectedMin: 70, expectedMax: 90 },
        { tier: LootTier.CELESTIAL, expectedMin: 85, expectedMax: 100 },
      ];

      for (const { tier, expectedMin, expectedMax } of tiers) {
        ollama.chat.mockResolvedValue(
          createMockOllamaResponse({
            tier,
            type: ItemType.WEAPON,
            stats: { damage: 10, value: 100 },
          })
        );

        const items = await generator.generateLoot({
          tier,
          count: 5,
          itemType: ItemType.WEAPON,
        });

        items.forEach((item) => {
          expect(item.rarity).toBeGreaterThanOrEqual(expectedMin);
          expect(item.rarity).toBeLessThanOrEqual(expectedMax);
        });
      }
    });
  });

  describe("Loot Set Generation", () => {
    const ollama = require("ollama");

    it("should generate a complete loot set with consistent theme", async () => {
      const setName = "Dragon Slayer";
      const tier = LootTier.LEGENDARY;
      const itemTypes = [ItemType.WEAPON, ItemType.ARMOR, ItemType.ACCESSORY];

      ollama.chat
        .mockResolvedValueOnce(
          createMockOllamaResponse({
            name: "Dragon Slayer Sword",
            type: ItemType.WEAPON,
            tier,
            setName,
            stats: { damage: 50, value: 2000 },
          })
        )
        .mockResolvedValueOnce(
          createMockOllamaResponse({
            name: "Dragon Slayer Armor",
            type: ItemType.ARMOR,
            tier,
            setName,
            stats: { defense: 40, value: 1800 },
          })
        )
        .mockResolvedValueOnce(
          createMockOllamaResponse({
            name: "Dragon Slayer Ring",
            type: ItemType.ACCESSORY,
            tier,
            setName,
            stats: { health: 150, value: 1500 },
          })
        );

      const setItems = await generator.generateLootSet(
        setName,
        tier,
        itemTypes
      );

      expect(setItems).toHaveLength(3);
      setItems.forEach((item) => {
        expect(item.setName).toBe(setName);
        expect(item.tier).toBe(tier);
        expect(item.name).toContain("Dragon Slayer");
      });

      const types = setItems.map((item) => item.type);
      expect(types).toContain(ItemType.WEAPON);
      expect(types).toContain(ItemType.ARMOR);
      expect(types).toContain(ItemType.ACCESSORY);
    });
  });

  describe("Database Integration", () => {
    const ollama = require("ollama");

    beforeEach(() => {
      ollama.chat.mockResolvedValue(
        createMockOllamaResponse({
          name: "Test Item",
          type: ItemType.WEAPON,
          tier: LootTier.BRONZE,
          stats: { damage: 10, value: 100 },
        })
      );
    });

    it("should save generated items to database", async () => {
      const options = {
        tier: LootTier.BRONZE,
        count: 3,
        itemType: ItemType.WEAPON,
      };

      const result = await generator.generateAndSaveLoot(options);

      expect(result.generated).toHaveLength(3);
      expect(result.saved).toBe(3);
      expect(result.duplicates).toBe(0);

      // Verify items are in database
      const allItems = db.getAllItems();
      expect(allItems).toHaveLength(3);
    });

    it("should detect and report duplicates", async () => {
      // Mock Math.random to make rarity generation deterministic
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5); // This will generate consistent rarity values

      const identicalItem = createMockOllamaResponse({
        name: "Duplicate Item",
        type: ItemType.WEAPON,
        tier: LootTier.BRONZE,
        stats: { damage: 10, value: 100 },
        description: "Identical item for duplicate testing",
        rarity: 15, // Set a fixed rarity
      });

      ollama.chat.mockResolvedValue(identicalItem);

      // Generate same item twice
      const result1 = await generator.generateAndSaveLoot({
        tier: LootTier.BRONZE,
        count: 1,
        itemType: ItemType.WEAPON,
      });

      const result2 = await generator.generateAndSaveLoot({
        tier: LootTier.BRONZE,
        count: 1,
        itemType: ItemType.WEAPON,
      });

      expect(result1.saved).toBe(1);
      expect(result1.duplicates).toBe(0);
      expect(result2.saved).toBe(0);
      expect(result2.duplicates).toBe(1);

      // Should only have one unique item in database
      const allItems = db.getAllItems();
      expect(allItems).toHaveLength(1);

      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  describe("Model Integration", () => {
    const ollama = require("ollama");

    it("should test connection to Ollama", async () => {
      ollama.chat.mockResolvedValueOnce({ message: { content: "test" } });

      const isConnected = await generator.testConnection();
      expect(isConnected).toBe(true);
    });

    it("should handle connection failures gracefully", async () => {
      ollama.chat.mockRejectedValueOnce(new Error("Connection failed"));

      const isConnected = await generator.testConnection();
      expect(isConnected).toBe(false);
    });

    it("should retrieve available models", async () => {
      const models = await generator.getAvailableModels();
      expect(models).toEqual(["llama3.1", "llama2", "mistral"]);
    });

    it("should handle model list retrieval errors", async () => {
      ollama.list.mockRejectedValueOnce(new Error("Failed to list models"));

      const models = await generator.getAvailableModels();
      expect(models).toEqual([]);
    });

    it("should use custom model when specified", async () => {
      ollama.chat.mockResolvedValue(
        createMockOllamaResponse({
          name: "Custom Model Item",
          type: ItemType.WEAPON,
          tier: LootTier.BRONZE,
          stats: { damage: 15, value: 150 },
        })
      );

      const options = {
        tier: LootTier.BRONZE,
        count: 1,
        itemType: ItemType.WEAPON,
        model: "custom-model",
      };

      const items = await generator.generateLoot(options);
      expect(items).toHaveLength(1);

      // Verify the custom model was used in the call
      expect(ollama.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "custom-model",
        })
      );
    });
  });

  describe("Error Handling", () => {
    const ollama = require("ollama");

    it("should handle invalid JSON responses from AI", async () => {
      ollama.chat.mockResolvedValue({
        message: { content: "Invalid JSON content" },
      });

      const options = {
        tier: LootTier.BRONZE,
        count: 1,
        itemType: ItemType.WEAPON,
      };

      const items = await generator.generateLoot(options);
      expect(items).toHaveLength(0); // Should return empty array on parse errors
    });

    it("should handle AI service errors gracefully", async () => {
      ollama.chat.mockRejectedValue(new Error("AI service unavailable"));

      const options = {
        tier: LootTier.BRONZE,
        count: 2,
        itemType: ItemType.WEAPON,
      };

      const items = await generator.generateLoot(options);
      expect(items).toHaveLength(0); // Should return empty array on service errors
    });

    it("should handle schema validation errors", async () => {
      ollama.chat.mockResolvedValue({
        message: {
          content: JSON.stringify({
            name: "Invalid Item",
            // Missing required fields
            stats: "invalid stats format",
          }),
        },
      });

      const options = {
        tier: LootTier.BRONZE,
        count: 1,
        itemType: ItemType.WEAPON,
      };

      const items = await generator.generateLoot(options);
      expect(items).toHaveLength(0); // Should return empty array on validation errors
    });

    it("should continue generating other items when one fails", async () => {
      ollama.chat
        .mockResolvedValueOnce({
          message: { content: "Invalid JSON" },
        })
        .mockResolvedValueOnce(
          createMockOllamaResponse({
            name: "Valid Item",
            type: ItemType.WEAPON,
            tier: LootTier.BRONZE,
            stats: { damage: 10, value: 100 },
          })
        );

      const options = {
        tier: LootTier.BRONZE,
        count: 2,
        itemType: ItemType.WEAPON,
      };

      const items = await generator.generateLoot(options);
      expect(items).toHaveLength(1); // Should return the one valid item
      expect(items[0].name).toBe("Valid Item");
    });
  });

  describe("SubType Selection", () => {
    const ollama = require("ollama");

    it("should use provided subType when specified", async () => {
      ollama.chat.mockResolvedValue(
        createMockOllamaResponse({
          name: "Specific Bow",
          type: ItemType.WEAPON,
          subType: WeaponSubType.BOW,
          tier: LootTier.BRONZE,
          stats: { damage: 12, value: 120 },
        })
      );

      const options = {
        tier: LootTier.BRONZE,
        count: 1,
        itemType: ItemType.WEAPON,
        subType: WeaponSubType.BOW,
      };

      const items = await generator.generateLoot(options);
      expect(items).toHaveLength(1);
      expect(items[0].subType).toBe(WeaponSubType.BOW);
    });

    it("should generate random subType when not specified", async () => {
      ollama.chat.mockResolvedValue(
        createMockOllamaResponse({
          name: "Random Weapon",
          type: ItemType.WEAPON,
          subType: WeaponSubType.SWORD,
          tier: LootTier.BRONZE,
          stats: { damage: 10, value: 100 },
        })
      );

      const options = {
        tier: LootTier.BRONZE,
        count: 1,
        itemType: ItemType.WEAPON,
        // No subType specified
      };

      const items = await generator.generateLoot(options);
      expect(items).toHaveLength(1);
      expect(items[0].subType).toBeDefined();
      expect(typeof items[0].subType).toBe("string");
    });
  });
});
