import { LootGenerator } from "../src/loot-generator.js";
import { LootDatabase } from "../src/database.js";
import { LootTier, ItemType, WeaponSubType } from "../src/types.js";
import {
  getTestDbPath,
  createMockOllamaResponse,
  createMockDatabase,
} from "./test-utils.js";
import fs from "fs";

// Mock better-sqlite3 to avoid native binding issues in tests
let mockDb: any;

jest.mock("better-sqlite3", () => {
  return jest.fn(() => mockDb);
});

// Mock ollama for integration tests
jest.mock("ollama", () => ({
  chat: jest.fn(),
  list: jest.fn().mockResolvedValue({
    models: [{ name: "llama3.1" }, { name: "llama2" }, { name: "mistral" }],
  }),
}));

describe("Integration Tests", () => {
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

  describe("End-to-End Loot Generation", () => {
    const ollama = require("ollama");

    it("should generate, save, and retrieve loot items successfully", async () => {
      // Mock successful loot generation
      ollama.chat.mockResolvedValue(
        createMockOllamaResponse({
          name: "Integration Test Sword",
          type: ItemType.WEAPON,
          subType: WeaponSubType.SWORD,
          tier: LootTier.GOLD,
          description: "A sword generated during integration testing",
          stats: { damage: 25, attackSpeed: 15, value: 800 },
          magicalProperties: [
            {
              name: "Sharpness",
              description: "Increases damage by 10%",
              magnitude: 10,
            },
          ],
          lore: "Forged in the fires of testing",
          rarity: 45,
        })
      );

      // Generate and save loot
      const result = await generator.generateAndSaveLoot({
        tier: LootTier.GOLD,
        count: 1,
        itemType: ItemType.WEAPON,
        subType: WeaponSubType.SWORD,
      });

      // Verify generation result
      expect(result.generated).toHaveLength(1);
      expect(result.saved).toBe(1);
      expect(result.duplicates).toBe(0);

      // Verify item properties
      const generatedItem = result.generated[0];
      expect(generatedItem.name).toBe("Integration Test Sword");
      expect(generatedItem.tier).toBe(LootTier.GOLD);
      expect(generatedItem.type).toBe(ItemType.WEAPON);
      expect(generatedItem.subType).toBe(WeaponSubType.SWORD);
      expect(generatedItem.rarity).toBeGreaterThan(0);
      expect(generatedItem.rarity).toBeLessThanOrEqual(100);
      expect(generatedItem.magicalProperties).toHaveLength(1);
      expect(generatedItem.lore).toBe("Forged in the fires of testing");

      // Verify database storage
      const allItems = db.getAllItems();
      expect(allItems).toHaveLength(1);

      const savedItem = allItems[0];
      expect(savedItem.name).toBe("Integration Test Sword");
      expect(savedItem.id).toBeGreaterThan(0);
      expect(savedItem.hash).toBeDefined();
      expect(savedItem.createdAt).toBeDefined();

      // Verify retrieval by tier
      const goldItems = db.getItemsByTier(LootTier.GOLD);
      expect(goldItems).toHaveLength(1);
      expect(goldItems[0].name).toBe("Integration Test Sword");

      // Verify statistics
      const stats = db.getStats();
      expect(stats.totalItems).toBe(1);
      expect(stats.itemsByTier[LootTier.GOLD]).toBe(1);
    });

    it("should handle loot set generation workflow", async () => {
      const setName = "Test Warrior Set";
      const tier = LootTier.PLATINUM;
      const itemTypes = [ItemType.WEAPON, ItemType.ARMOR];

      // Mock responses for set items
      ollama.chat
        .mockResolvedValueOnce(
          createMockOllamaResponse({
            name: "Test Warrior Blade",
            type: ItemType.WEAPON,
            subType: WeaponSubType.SWORD,
            tier,
            setName,
            description: "A blade from the Test Warrior set",
            stats: { damage: 35, value: 1200 },
            rarity: 65,
          })
        )
        .mockResolvedValueOnce(
          createMockOllamaResponse({
            name: "Test Warrior Plate",
            type: ItemType.ARMOR,
            subType: "Chestpiece",
            tier,
            setName,
            description: "Armor from the Test Warrior set",
            stats: { defense: 25, value: 1000 },
            rarity: 68,
          })
        );

      // Generate the set
      const setItems = await generator.generateLootSet(
        setName,
        tier,
        itemTypes
      );

      // Verify set generation
      expect(setItems).toHaveLength(2);
      setItems.forEach((item) => {
        expect(item.setName).toBe(setName);
        expect(item.tier).toBe(tier);
        expect(item.name).toContain("Test Warrior");
      });

      // Save the set items to database
      for (const item of setItems) {
        db.saveItem(item);
      }

      // Verify set retrieval
      const retrievedSetItems = db.getItemsBySetName(setName);
      expect(retrievedSetItems).toHaveLength(2);

      const itemNames = retrievedSetItems.map((item) => item.name);
      expect(itemNames).toContain("Test Warrior Blade");
      expect(itemNames).toContain("Test Warrior Plate");
    });

    it("should maintain data integrity across multiple operations", async () => {
      // Generate multiple different items
      const operations = [
        {
          tier: LootTier.BRONZE,
          count: 2,
          itemType: ItemType.WEAPON,
          mockResponse: createMockOllamaResponse({
            name: "Bronze Item",
            type: ItemType.WEAPON,
            tier: LootTier.BRONZE,
            stats: { damage: 10, value: 100 },
          }),
        },
        {
          tier: LootTier.SILVER,
          count: 1,
          itemType: ItemType.ARMOR,
          mockResponse: createMockOllamaResponse({
            name: "Silver Armor",
            type: ItemType.ARMOR,
            tier: LootTier.SILVER,
            stats: { defense: 12, value: 300 },
          }),
        },
        {
          tier: LootTier.LEGENDARY,
          count: 1,
          itemType: ItemType.ACCESSORY,
          mockResponse: createMockOllamaResponse({
            name: "Legendary Ring",
            type: ItemType.ACCESSORY,
            tier: LootTier.LEGENDARY,
            stats: { health: 150, value: 2500 },
          }),
        },
      ];

      let totalGenerated = 0;
      let totalSaved = 0;

      for (const operation of operations) {
        ollama.chat.mockResolvedValue(operation.mockResponse);

        const result = await generator.generateAndSaveLoot({
          tier: operation.tier,
          count: operation.count,
          itemType: operation.itemType,
        });

        totalGenerated += result.generated.length;
        totalSaved += result.saved;
      }

      // Verify total counts
      expect(totalGenerated).toBe(4); // 2 + 1 + 1
      expect(totalSaved).toBe(4);

      // Verify database state
      const allItems = db.getAllItems();
      expect(allItems).toHaveLength(4);

      // Verify statistics
      const stats = db.getStats();
      expect(stats.totalItems).toBe(4);
      expect(stats.itemsByTier[LootTier.BRONZE]).toBe(2);
      expect(stats.itemsByTier[LootTier.SILVER]).toBe(1);
      expect(stats.itemsByTier[LootTier.LEGENDARY]).toBe(1);

      // Verify tier filtering works correctly
      const bronzeItems = db.getItemsByTier(LootTier.BRONZE);
      const silverItems = db.getItemsByTier(LootTier.SILVER);
      const legendaryItems = db.getItemsByTier(LootTier.LEGENDARY);

      expect(bronzeItems).toHaveLength(2);
      expect(silverItems).toHaveLength(1);
      expect(legendaryItems).toHaveLength(1);
    });
  });

  describe("Error Recovery and Resilience", () => {
    const ollama = require("ollama");

    it("should gracefully handle partial failures in batch generation", async () => {
      // Mock mixed success/failure responses
      ollama.chat
        .mockRejectedValueOnce(new Error("AI service temporary failure"))
        .mockResolvedValueOnce(
          createMockOllamaResponse({
            name: "Success Item 1",
            type: ItemType.WEAPON,
            tier: LootTier.BRONZE,
            stats: { damage: 8, value: 80 },
          })
        )
        .mockResolvedValueOnce({
          message: { content: "Invalid JSON response" },
        })
        .mockResolvedValueOnce(
          createMockOllamaResponse({
            name: "Success Item 2",
            type: ItemType.WEAPON,
            tier: LootTier.BRONZE,
            stats: { damage: 9, value: 90 },
          })
        );

      const result = await generator.generateAndSaveLoot({
        tier: LootTier.BRONZE,
        count: 4,
        itemType: ItemType.WEAPON,
      });

      // Should have generated 2 successful items out of 4 attempts
      expect(result.generated).toHaveLength(2);
      expect(result.saved).toBe(2);
      expect(result.duplicates).toBe(0);

      const itemNames = result.generated.map((item) => item.name);
      expect(itemNames).toContain("Success Item 1");
      expect(itemNames).toContain("Success Item 2");

      // Verify database integrity
      const allItems = db.getAllItems();
      expect(allItems).toHaveLength(2);
    });

    it("should handle database conflicts and continue operations", async () => {
      // Mock Math.random to make rarity generation deterministic
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.5); // This will generate consistent rarity values

      // Generate identical items to test duplicate handling
      const identicalMockResponse = createMockOllamaResponse({
        name: "Duplicate Test Item",
        type: ItemType.WEAPON,
        tier: LootTier.BRONZE,
        description: "This item should be identical",
        stats: { damage: 10, value: 100 },
        rarity: 20,
      });

      ollama.chat.mockResolvedValue(identicalMockResponse);

      // First generation should succeed
      const result1 = await generator.generateAndSaveLoot({
        tier: LootTier.BRONZE,
        count: 1,
        itemType: ItemType.WEAPON,
      });

      expect(result1.saved).toBe(1);
      expect(result1.duplicates).toBe(0);

      // Second generation should detect duplicate
      const result2 = await generator.generateAndSaveLoot({
        tier: LootTier.BRONZE,
        count: 1,
        itemType: ItemType.WEAPON,
      });

      expect(result2.saved).toBe(0);
      expect(result2.duplicates).toBe(1);

      // Database should still have only one item
      const allItems = db.getAllItems();
      expect(allItems).toHaveLength(1);
      expect(allItems[0].name).toBe("Duplicate Test Item");

      // Restore Math.random
      Math.random = originalRandom;
    });
  });
});
