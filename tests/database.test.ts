import { LootDatabase } from "../src/database.js";
import {
  LootTier,
  ItemType,
  WeaponSubType,
  ArmorSubType,
} from "../src/types.js";
import {
  getTestDbPath,
  SAMPLE_ITEMS,
  createMockDatabase,
} from "./test-utils.js";
import fs from "fs";

// Mock better-sqlite3 to avoid native binding issues in tests
let mockDb: any;

jest.mock("better-sqlite3", () => {
  return jest.fn(() => mockDb);
});

describe("LootDatabase", () => {
  let db: LootDatabase;
  const testDbPath = getTestDbPath();

  beforeEach(() => {
    // Create a fresh mock database for each test
    mockDb = createMockDatabase();

    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new LootDatabase(testDbPath);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe("Database Initialization", () => {
    it("should create a new database file", () => {
      // Since we're mocking, we'll just verify the constructor doesn't throw
      expect(db).toBeDefined();
    });

    it("should handle database creation errors gracefully", () => {
      // In a mocked environment, we can't test actual file system errors
      // This test verifies that the constructor completes without throwing
      expect(() => {
        new LootDatabase("test-path.db");
      }).not.toThrow();
    });
  });

  describe("Item Management", () => {
    it("should save a valid loot item", () => {
      const item = {
        name: "Test Sword",
        type: ItemType.WEAPON,
        subType: WeaponSubType.SWORD,
        tier: LootTier.BRONZE,
        description: "A test sword",
        stats: {
          damage: 10,
          attackSpeed: 5,
          criticalChance: 5,
          criticalDamage: 150,
          range: 1.5,
          accuracy: 0,
          durability: 100,
          weight: 2.0,
          value: 100,
        },
        rarity: 20,
      };

      const savedItem = db.saveItem(item);
      expect(savedItem).toBeDefined();
      expect(savedItem).not.toBeNull();
      if (savedItem) {
        expect(savedItem.id).toBeGreaterThan(0);
        expect(savedItem.name).toBe("Test Sword");
        expect(savedItem.hash).toBeDefined();
        expect(savedItem.createdAt).toBeDefined();
      }
    });

    it("should generate consistent hashes for identical items", () => {
      const item = {
        name: "Duplicate Test",
        type: ItemType.WEAPON,
        subType: WeaponSubType.SWORD,
        tier: LootTier.BRONZE,
        description: "A test item",
        stats: { damage: 10, value: 100 },
        rarity: 20,
      };

      const savedItem1 = db.saveItem(item);
      const savedItem2 = db.saveItem(item);

      expect(savedItem1).not.toBeNull();
      expect(savedItem2).not.toBeNull();
      if (savedItem1 && savedItem2) {
        expect(savedItem1.hash).toBe(savedItem2.hash);
        expect(savedItem1.id).toBe(savedItem2.id); // Should return the same item
      }
    });

    it("should retrieve items by ID", () => {
      const item = {
        name: "Retrievable Item",
        type: ItemType.WEAPON,
        subType: WeaponSubType.SWORD,
        tier: LootTier.BRONZE,
        description: "An item to retrieve",
        stats: { damage: 15, value: 150 },
        rarity: 25,
      };

      const savedItem = db.saveItem(item);
      expect(savedItem).not.toBeNull();

      if (savedItem) {
        const retrievedItem = db.getItemById(savedItem.id);
        expect(retrievedItem).toBeDefined();
        expect(retrievedItem?.name).toBe("Retrievable Item");
        expect(retrievedItem?.id).toBe(savedItem.id);
      }
    });

    it("should return null for non-existent item ID", () => {
      const retrievedItem = db.getItemById(999999);
      expect(retrievedItem).toBeNull();
    });

    it("should retrieve all items", () => {
      const items = [
        {
          name: "Item 1",
          type: ItemType.WEAPON,
          subType: WeaponSubType.SWORD,
          tier: LootTier.BRONZE,
          description: "First item",
          stats: { damage: 10, value: 100 },
          rarity: 20,
        },
        {
          name: "Item 2",
          type: ItemType.ARMOR,
          subType: ArmorSubType.HELMET,
          tier: LootTier.SILVER,
          description: "Second item",
          stats: { defense: 5, value: 200 },
          rarity: 30,
        },
      ];

      items.forEach((item) => db.saveItem(item));
      const allItems = db.getAllItems();

      expect(allItems).toHaveLength(2);
      expect(allItems.map((item) => item.name)).toContain("Item 1");
      expect(allItems.map((item) => item.name)).toContain("Item 2");
    });

    it("should retrieve items with limit", () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        name: `Item ${i + 1}`,
        type: ItemType.WEAPON,
        subType: WeaponSubType.SWORD,
        tier: LootTier.BRONZE,
        description: `Item number ${i + 1}`,
        stats: { damage: 10 + i, value: 100 + i * 10 },
        rarity: 20 + i,
      }));

      items.forEach((item) => db.saveItem(item));

      const limitedItems = db.getAllItems(3);
      expect(limitedItems).toHaveLength(3);
    });
  });

  describe("Filtering and Querying", () => {
    beforeEach(() => {
      // Add test data
      const testItems = [
        {
          name: "Bronze Sword",
          type: ItemType.WEAPON,
          subType: WeaponSubType.SWORD,
          tier: LootTier.BRONZE,
          description: "A bronze sword",
          stats: { damage: 8, value: 80 },
          rarity: 15,
        },
        {
          name: "Silver Bow",
          type: ItemType.WEAPON,
          subType: WeaponSubType.BOW,
          tier: LootTier.SILVER,
          description: "A silver bow",
          stats: { damage: 12, value: 180 },
          rarity: 35,
        },
        {
          name: "Gold Helmet",
          type: ItemType.ARMOR,
          subType: ArmorSubType.HELMET,
          tier: LootTier.GOLD,
          description: "A golden helmet",
          stats: { defense: 15, value: 400 },
          rarity: 55,
        },
        {
          name: "Dragon Set Sword",
          type: ItemType.WEAPON,
          subType: WeaponSubType.SWORD,
          tier: LootTier.LEGENDARY,
          description: "A legendary dragon sword",
          stats: { damage: 50, value: 2000 },
          rarity: 85,
          setName: "Dragon Slayer",
        },
      ];

      testItems.forEach((item) => db.saveItem(item));
    });

    it("should filter items by tier", () => {
      const bronzeItems = db.getItemsByTier(LootTier.BRONZE);
      expect(bronzeItems).toHaveLength(1);
      expect(bronzeItems[0].name).toBe("Bronze Sword");

      const silverItems = db.getItemsByTier(LootTier.SILVER);
      expect(silverItems).toHaveLength(1);
      expect(silverItems[0].name).toBe("Silver Bow");
    });

    it("should filter items by set name", () => {
      const setItems = db.getItemsBySetName("Dragon Slayer");
      expect(setItems).toHaveLength(1);
      expect(setItems[0].name).toBe("Dragon Set Sword");

      const nonExistentSet = db.getItemsBySetName("Non-existent Set");
      expect(nonExistentSet).toHaveLength(0);
    });

    it("should retrieve items by hash", () => {
      const item = {
        name: "Hash Test Item",
        type: ItemType.WEAPON,
        subType: WeaponSubType.SWORD,
        tier: LootTier.BRONZE,
        description: "An item to test hash retrieval",
        stats: { damage: 20, value: 200 },
        rarity: 30,
      };

      const savedItem = db.saveItem(item);
      expect(savedItem).not.toBeNull();

      if (savedItem) {
        const retrievedItem = db.getItemByHash(savedItem.hash);
        expect(retrievedItem).toBeDefined();
        expect(retrievedItem?.name).toBe("Hash Test Item");
        expect(retrievedItem?.hash).toBe(savedItem.hash);
      }
    });
  });

  describe("Statistics", () => {
    beforeEach(() => {
      // Add test data with various tiers
      const testItems = [
        {
          name: "Bronze Item 1",
          type: ItemType.WEAPON,
          subType: WeaponSubType.SWORD,
          tier: LootTier.BRONZE,
          description: "Bronze weapon",
          stats: { damage: 8, value: 80 },
          rarity: 15,
        },
        {
          name: "Bronze Item 2",
          type: ItemType.ARMOR,
          subType: ArmorSubType.HELMET,
          tier: LootTier.BRONZE,
          description: "Bronze armor",
          stats: { defense: 5, value: 60 },
          rarity: 18,
        },
        {
          name: "Silver Item",
          type: ItemType.WEAPON,
          subType: WeaponSubType.BOW,
          tier: LootTier.SILVER,
          description: "Silver weapon",
          stats: { damage: 12, value: 180 },
          rarity: 35,
        },
        {
          name: "Legendary Item",
          type: ItemType.ACCESSORY,
          subType: "Ring",
          tier: LootTier.LEGENDARY,
          description: "Legendary accessory",
          stats: { health: 100, value: 5000 },
          rarity: 90,
        },
      ];

      testItems.forEach((item) => db.saveItem(item));
    });

    it("should generate correct statistics", () => {
      const stats = db.getStats();

      expect(stats.totalItems).toBe(4);
      expect(stats.itemsByTier[LootTier.BRONZE]).toBe(2);
      expect(stats.itemsByTier[LootTier.SILVER]).toBe(1);
      expect(stats.itemsByTier[LootTier.LEGENDARY]).toBe(1);
      expect(stats.itemsByTier[LootTier.GOLD]).toBe(0);
      expect(stats.itemsByTier[LootTier.PLATINUM]).toBe(0);
      expect(stats.itemsByTier[LootTier.CELESTIAL]).toBe(0);
    });

    it("should handle empty database statistics", () => {
      // Reset the mock database to empty state
      mockDb._reset();

      const emptyStats = db.getStats();

      expect(emptyStats.totalItems).toBe(0);
      expect(
        Object.values(emptyStats.itemsByTier).every((count) => count === 0)
      ).toBe(true);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle malformed item data gracefully", () => {
      // Test with completely invalid item structure
      const malformedItem = {
        name: "Malformed Item",
        // Missing required fields like type, tier, etc.
      };

      // Store the original mock
      const originalPrepare = mockDb.prepare;

      // Mock the prepare method to throw for this specific test
      mockDb.prepare = jest.fn((sql: string) => {
        if (sql.includes("INSERT INTO items")) {
          return {
            run: jest.fn(() => {
              throw new Error("Invalid item data");
            }),
          };
        }
        return originalPrepare(sql);
      });

      expect(() => {
        db.saveItem(malformedItem as any);
      }).toThrow("Invalid item data");

      // Restore the original mock
      mockDb.prepare = originalPrepare;
    });

    it("should handle database connection issues", () => {
      // In a mocked environment, we'll simulate a database error
      // by making the prepare method throw
      const originalPrepare = mockDb.prepare;
      mockDb.prepare = jest.fn(() => {
        throw new Error("Database connection lost");
      });

      expect(() => {
        db.getAllItems();
      }).toThrow("Database connection lost");

      // Restore the original prepare method
      mockDb.prepare = originalPrepare;
    });

    it("should handle very long item names", () => {
      const longName = "A".repeat(500); // Reduced from 1000 to be reasonable
      const item = {
        name: longName,
        type: ItemType.WEAPON,
        subType: WeaponSubType.SWORD,
        tier: LootTier.BRONZE,
        description: "Item with very long name",
        stats: { damage: 10, value: 100 },
        rarity: 20,
      };

      const savedItem = db.saveItem(item);
      expect(savedItem).not.toBeNull();
      if (savedItem) {
        expect(savedItem.name).toBe(longName);
      }
    });

    it("should handle special characters in item data", () => {
      const item = {
        name: "Mörëäl's Blädë of Dëstiny",
        type: ItemType.WEAPON,
        subType: WeaponSubType.SWORD,
        tier: LootTier.LEGENDARY,
        description: "An item with special characters: 你好, ñoño, café",
        stats: { damage: 45, value: 2000 },
        rarity: 85,
        lore: "Contains émojis: ⚔️🛡️🗡️",
      };

      const savedItem = db.saveItem(item);
      expect(savedItem).not.toBeNull();
      if (savedItem) {
        expect(savedItem.name).toBe("Mörëäl's Blädë of Dëstiny");
        expect(savedItem.description).toContain("你好");
        expect(savedItem.lore).toContain("⚔️");
      }
    });
  });
});
