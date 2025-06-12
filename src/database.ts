import Database from "better-sqlite3";
import { createHash } from "crypto";
import path from "path";
import os from "os";
import fs from "fs";
import { LootItem, DatabaseItem, LootSet, LootTier } from "./types.js";

export class LootDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.join(os.homedir(), ".ai-loot", "loot.db");
    const finalPath = dbPath || defaultPath;

    // Ensure directory exists
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(finalPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    // Items table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        subType TEXT NOT NULL,
        tier TEXT NOT NULL,
        description TEXT NOT NULL,
        stats TEXT NOT NULL,
        magicalProperties TEXT,
        lore TEXT,
        setName TEXT,
        rarity INTEGER NOT NULL,
        hash TEXT UNIQUE NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

    // Loot sets table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS loot_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        tier TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

    // Set items junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS set_items (
        setId INTEGER,
        itemId INTEGER,
        FOREIGN KEY (setId) REFERENCES loot_sets (id),
        FOREIGN KEY (itemId) REFERENCES items (id),
        PRIMARY KEY (setId, itemId)
      )
    `);

    // Indexes for better performance
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_items_tier ON items(tier)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_items_hash ON items(hash)`);
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_items_setName ON items(setName)`
    );
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_items_type ON items(type)`);
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_items_subType ON items(subType)`
    );
  }

  private generateHash(item: Omit<LootItem, "rarity">): string {
    const content = JSON.stringify({
      name: item.name,
      type: item.type,
      subType: item.subType,
      tier: item.tier,
      description: item.description,
      stats: item.stats,
      magicalProperties: item.magicalProperties?.sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      lore: item.lore,
      setName: item.setName,
    });
    return createHash("sha256").update(content).digest("hex");
  }

  saveItem(item: LootItem): DatabaseItem | null {
    const hash = this.generateHash(item);

    // Check if item already exists
    const existing = this.getItemByHash(hash);
    if (existing) {
      return existing;
    }

    const stmt = this.db.prepare(`
      INSERT INTO items (name, type, subType, tier, description, stats, magicalProperties, lore, setName, rarity, hash, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      item.name,
      item.type,
      item.subType,
      item.tier,
      item.description,
      JSON.stringify(item.stats),
      item.magicalProperties ? JSON.stringify(item.magicalProperties) : null,
      item.lore,
      item.setName,
      item.rarity,
      hash,
      new Date().toISOString()
    );

    return this.getItemById(result.lastInsertRowid as number);
  }

  getItemById(id: number): DatabaseItem | null {
    const stmt = this.db.prepare("SELECT * FROM items WHERE id = ?");
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      subType: row.subType,
      tier: row.tier,
      description: row.description,
      stats: JSON.parse(row.stats),
      magicalProperties: row.magicalProperties
        ? JSON.parse(row.magicalProperties)
        : undefined,
      lore: row.lore,
      setName: row.setName,
      rarity: row.rarity,
      hash: row.hash,
      createdAt: row.createdAt,
    };
  }

  getItemByHash(hash: string): DatabaseItem | null {
    const stmt = this.db.prepare("SELECT * FROM items WHERE hash = ?");
    const row = stmt.get(hash) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      subType: row.subType,
      tier: row.tier,
      description: row.description,
      stats: JSON.parse(row.stats),
      magicalProperties: row.magicalProperties
        ? JSON.parse(row.magicalProperties)
        : undefined,
      lore: row.lore,
      setName: row.setName,
      rarity: row.rarity,
      hash: row.hash,
      createdAt: row.createdAt,
    };
  }

  getItemsByTier(tier: LootTier): DatabaseItem[] {
    const stmt = this.db.prepare(
      "SELECT * FROM items WHERE tier = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(tier) as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      subType: row.subType,
      tier: row.tier,
      description: row.description,
      stats: JSON.parse(row.stats),
      magicalProperties: row.magicalProperties
        ? JSON.parse(row.magicalProperties)
        : undefined,
      lore: row.lore,
      setName: row.setName,
      rarity: row.rarity,
      hash: row.hash,
      createdAt: row.createdAt,
    }));
  }

  getItemsBySetName(setName: string): DatabaseItem[] {
    const stmt = this.db.prepare(
      "SELECT * FROM items WHERE setName = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(setName) as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      subType: row.subType,
      tier: row.tier,
      description: row.description,
      stats: JSON.parse(row.stats),
      magicalProperties: row.magicalProperties
        ? JSON.parse(row.magicalProperties)
        : undefined,
      lore: row.lore,
      setName: row.setName,
      rarity: row.rarity,
      hash: row.hash,
      createdAt: row.createdAt,
    }));
  }

  getAllItems(limit?: number): DatabaseItem[] {
    const sql = limit
      ? "SELECT * FROM items ORDER BY createdAt DESC LIMIT ?"
      : "SELECT * FROM items ORDER BY createdAt DESC";

    const stmt = this.db.prepare(sql);
    const rows = limit ? (stmt.all(limit) as any[]) : (stmt.all() as any[]);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      subType: row.subType,
      tier: row.tier,
      description: row.description,
      stats: JSON.parse(row.stats),
      magicalProperties: row.magicalProperties
        ? JSON.parse(row.magicalProperties)
        : undefined,
      lore: row.lore,
      setName: row.setName,
      rarity: row.rarity,
      hash: row.hash,
      createdAt: row.createdAt,
    }));
  }

  getStats(): { totalItems: number; itemsByTier: Record<LootTier, number> } {
    const totalStmt = this.db.prepare("SELECT COUNT(*) as count FROM items");
    const totalResult = totalStmt.get() as { count: number };

    const itemsByTier: Record<LootTier, number> = {} as Record<
      LootTier,
      number
    >;

    for (const tier of Object.values(LootTier)) {
      const tierStmt = this.db.prepare(
        "SELECT COUNT(*) as count FROM items WHERE tier = ?"
      );
      const tierResult = tierStmt.get(tier) as { count: number };
      itemsByTier[tier] = tierResult.count;
    }

    return {
      totalItems: totalResult.count,
      itemsByTier,
    };
  }

  close(): void {
    this.db.close();
  }
}
