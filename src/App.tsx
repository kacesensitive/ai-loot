import React, { useState, useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { LootDatabase } from "./database.js";
import { LootGenerator } from "./loot-generator.js";
import { LootDisplay } from "./components/LootDisplay.js";
import { LoadingSpinner } from "./components/LoadingSpinner.js";
import { LootTier, ItemType, DatabaseItem } from "./types.js";

interface AppProps {
  command: string;
  tier?: LootTier;
  count?: number;
  itemType?: ItemType;
  subType?: string;
  setName?: string;
  model?: string;
  list?: boolean;
  stats?: boolean;
}

export const App: React.FC<AppProps> = ({
  command,
  tier = LootTier.BRONZE,
  count = 1,
  itemType,
  subType,
  setName,
  model,
  list,
  stats,
}) => {
  const { exit } = useApp();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DatabaseItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const runCommand = async () => {
      try {
        const db = new LootDatabase();
        const generator = new LootGenerator(db, model);

        if (command === "generate") {
          setLoading(true);

          // Test connection first
          const connected = await generator.testConnection(model);
          if (!connected) {
            setError(
              `Failed to connect to Ollama. Make sure Ollama is running and model "${
                model || "llama3.1"
              }" is available.`
            );
            setLoading(false);
            return;
          }

          const options = {
            tier,
            count,
            itemType,
            subType,
            setName,
            model,
          };

          const generationResult = await generator.generateAndSaveLoot(options);

          setItems(
            generationResult.generated.map((item, index) => ({
              ...item,
              id: index + 1,
              createdAt: new Date().toISOString(),
              hash: `temp-${index}`,
            }))
          );

          setResult(
            `Generated ${generationResult.generated.length} items (${generationResult.saved} new, ${generationResult.duplicates} duplicates)`
          );
          setLoading(false);
        } else if (command === "list") {
          const allItems = list ? db.getAllItems(20) : [];
          setItems(allItems);
        } else if (command === "stats") {
          const dbStats = db.getStats();
          setResult(
            `Total items: ${dbStats.totalItems}\n\nBy tier:\n${Object.entries(
              dbStats.itemsByTier
            )
              .map(([tier, count]) => `  ${tier}: ${count}`)
              .join("\n")}`
          );
        } else if (command === "models") {
          const models = await generator.getAvailableModels();
          setResult(
            `Available models:\n${models.map((m) => `  • ${m}`).join("\n")}`
          );
        }

        db.close();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setLoading(false);
      }
    };

    runCommand();
  }, [command, tier, count, itemType, subType, setName, model, list, stats]);

  // Auto-exit after displaying results
  useEffect(() => {
    if ((items.length > 0 || result || error) && !loading) {
      const timer = setTimeout(() => {
        exit();
      }, 100); // Small delay to ensure rendering

      return () => clearTimeout(timer);
    }
  }, [items, result, error, loading, exit]);

  if (loading) {
    return <LoadingSpinner message="Generating magical loot with AI..." />;
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>
          Error:
        </Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (result) {
    return (
      <Box flexDirection="column">
        <Text color="green">{result}</Text>
      </Box>
    );
  }

  if (items.length > 0) {
    return <LootDisplay items={items} />;
  }

  return (
    <Box>
      <Text color="gray">No results to display</Text>
    </Box>
  );
};
