// Global test setup
import fs from "fs";
import path from "path";

// Clean up test databases before each test
beforeEach(() => {
  const testDbPath = path.join(process.cwd(), "test-loot.db");
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});

// Global test timeout for async operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
