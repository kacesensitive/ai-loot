import React from "react";
import { Box, Text } from "ink";
import {
  DatabaseItem,
  LootTier,
  ItemType,
  WeaponStats,
  ArmorStats,
  AccessoryStats,
  ConsumableStats,
  MaterialStats,
} from "../types.js";

interface LootDisplayProps {
  items: DatabaseItem[];
  title?: string;
}

export const LootDisplay: React.FC<LootDisplayProps> = ({
  items,
  title = "Generated Loot",
}) => {
  const getTierColor = (tier: LootTier): string => {
    const colors = {
      [LootTier.BRONZE]: "#CD7F32",
      [LootTier.SILVER]: "#C0C0C0",
      [LootTier.GOLD]: "#FFD700",
      [LootTier.PLATINUM]: "#E5E4E2",
      [LootTier.LEGENDARY]: "#FF6347",
      [LootTier.CELESTIAL]: "#9370DB",
    };
    return colors[tier];
  };

  const getTierSymbol = (tier: LootTier): string => {
    const symbols = {
      [LootTier.BRONZE]: "●",
      [LootTier.SILVER]: "◆",
      [LootTier.GOLD]: "★",
      [LootTier.PLATINUM]: "◊",
      [LootTier.LEGENDARY]: "♦",
      [LootTier.CELESTIAL]: "✦",
    };
    return symbols[tier];
  };

  const getRarityBar = (rarity: number): string => {
    const filled = Math.floor(rarity / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  };

  const formatStatValue = (
    value: number | undefined,
    suffix: string = ""
  ): string => {
    if (value === undefined) return "";
    return value.toString() + suffix;
  };

  const renderStats = (item: DatabaseItem) => {
    const stats = item.stats;

    switch (item.type) {
      case ItemType.WEAPON:
        const weaponStats = stats as WeaponStats;
        return (
          <Box flexDirection="column" marginLeft={2}>
            <Text color="cyan">Weapon Stats:</Text>
            <Box marginLeft={2}>
              <Text color="red">⚔ Damage: {weaponStats.damage}</Text>
              {weaponStats.attackSpeed && (
                <Text color="yellow">
                  {" "}
                  | ⚡ Speed: {formatStatValue(weaponStats.attackSpeed, "%")}
                </Text>
              )}
            </Box>
            {(weaponStats.criticalChance || weaponStats.criticalDamage) && (
              <Box marginLeft={2}>
                {weaponStats.criticalChance && (
                  <Text color="orange">
                    💥 Crit Chance:{" "}
                    {formatStatValue(weaponStats.criticalChance, "%")}
                  </Text>
                )}
                {weaponStats.criticalDamage && (
                  <Text color="orange">
                    {" "}
                    | Crit Damage:{" "}
                    {formatStatValue(weaponStats.criticalDamage, "%")}
                  </Text>
                )}
              </Box>
            )}
            {(weaponStats.range || weaponStats.accuracy) && (
              <Box marginLeft={2}>
                {weaponStats.range && (
                  <Text color="blue">
                    📏 Range: {formatStatValue(weaponStats.range, "m")}
                  </Text>
                )}
                {weaponStats.accuracy && (
                  <Text color="blue">
                    {" "}
                    | 🎯 Accuracy: {formatStatValue(weaponStats.accuracy, "%")}
                  </Text>
                )}
              </Box>
            )}
          </Box>
        );

      case ItemType.ARMOR:
        const armorStats = stats as ArmorStats;
        return (
          <Box flexDirection="column" marginLeft={2}>
            <Text color="cyan">Armor Stats:</Text>
            <Box marginLeft={2}>
              <Text color="blue">🛡 Defense: {armorStats.defense}</Text>
              {armorStats.magicResistance && (
                <Text color="purple">
                  {" "}
                  | ✨ Magic Resist:{" "}
                  {formatStatValue(armorStats.magicResistance, "%")}
                </Text>
              )}
            </Box>
            {armorStats.elementalResistance && (
              <Box marginLeft={2}>
                <Text color="magenta">Elemental Resistances:</Text>
                <Box marginLeft={2}>
                  {armorStats.elementalResistance.fire && (
                    <Text color="red">
                      🔥 Fire:{" "}
                      {formatStatValue(
                        armorStats.elementalResistance.fire,
                        "%"
                      )}{" "}
                    </Text>
                  )}
                  {armorStats.elementalResistance.ice && (
                    <Text color="cyan">
                      ❄️ Ice:{" "}
                      {formatStatValue(armorStats.elementalResistance.ice, "%")}{" "}
                    </Text>
                  )}
                  {armorStats.elementalResistance.lightning && (
                    <Text color="yellow">
                      ⚡ Lightning:{" "}
                      {formatStatValue(
                        armorStats.elementalResistance.lightning,
                        "%"
                      )}{" "}
                    </Text>
                  )}
                  {armorStats.elementalResistance.poison && (
                    <Text color="green">
                      ☠️ Poison:{" "}
                      {formatStatValue(
                        armorStats.elementalResistance.poison,
                        "%"
                      )}{" "}
                    </Text>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        );

      case ItemType.ACCESSORY:
        const accessoryStats = stats as AccessoryStats;
        return (
          <Box flexDirection="column" marginLeft={2}>
            <Text color="cyan">Accessory Stats:</Text>
            <Box marginLeft={2}>
              {accessoryStats.health && (
                <Text color="red">❤️ Health: +{accessoryStats.health} </Text>
              )}
              {accessoryStats.mana && (
                <Text color="blue">💧 Mana: +{accessoryStats.mana} </Text>
              )}
              {accessoryStats.stamina && (
                <Text color="green">
                  ⚡ Stamina: +{accessoryStats.stamina}{" "}
                </Text>
              )}
            </Box>
            <Box marginLeft={2}>
              {accessoryStats.strength && (
                <Text color="red">💪 STR: +{accessoryStats.strength} </Text>
              )}
              {accessoryStats.dexterity && (
                <Text color="green">🏃 DEX: +{accessoryStats.dexterity} </Text>
              )}
              {accessoryStats.intelligence && (
                <Text color="blue">
                  🧠 INT: +{accessoryStats.intelligence}{" "}
                </Text>
              )}
              {accessoryStats.wisdom && (
                <Text color="purple">🔮 WIS: +{accessoryStats.wisdom} </Text>
              )}
              {accessoryStats.constitution && (
                <Text color="orange">
                  🛡 CON: +{accessoryStats.constitution}{" "}
                </Text>
              )}
              {accessoryStats.luck && (
                <Text color="yellow">🍀 LUCK: +{accessoryStats.luck} </Text>
              )}
            </Box>
          </Box>
        );

      case ItemType.CONSUMABLE:
        const consumableStats = stats as ConsumableStats;
        return (
          <Box flexDirection="column" marginLeft={2}>
            <Text color="cyan">Consumable Effects:</Text>
            <Box marginLeft={2}>
              {consumableStats.healingPower && (
                <Text color="red">
                  ❤️ Heals: {consumableStats.healingPower} HP{" "}
                </Text>
              )}
              {consumableStats.manaPower && (
                <Text color="blue">
                  💧 Restores: {consumableStats.manaPower} MP{" "}
                </Text>
              )}
              {consumableStats.duration && (
                <Text color="yellow">
                  ⏱ Duration: {consumableStats.duration}s{" "}
                </Text>
              )}
              {consumableStats.stackSize && (
                <Text color="gray">📦 Stack: {consumableStats.stackSize} </Text>
              )}
            </Box>
          </Box>
        );

      case ItemType.MATERIAL:
        const materialStats = stats as MaterialStats;
        return (
          <Box flexDirection="column" marginLeft={2}>
            <Text color="cyan">Material Properties:</Text>
            <Box marginLeft={2}>
              {materialStats.purity && (
                <Text color="white">
                  ✨ Purity: {formatStatValue(materialStats.purity, "%")}{" "}
                </Text>
              )}
              {materialStats.stackSize && (
                <Text color="gray">📦 Stack: {materialStats.stackSize} </Text>
              )}
              {materialStats.craftingBonus && (
                <Text color="green">
                  🔨 Crafting Bonus: +
                  {formatStatValue(materialStats.craftingBonus, "%")}{" "}
                </Text>
              )}
            </Box>
          </Box>
        );

      default:
        return (
          <Box flexDirection="column" marginLeft={2}>
            <Text color="cyan">Base Stats:</Text>
            <Box marginLeft={2}>
              {stats.durability && (
                <Text color="gray">🔧 Durability: {stats.durability} </Text>
              )}
              {stats.weight && (
                <Text color="gray">
                  ⚖️ Weight: {formatStatValue(stats.weight, "kg")}{" "}
                </Text>
              )}
              {stats.value && (
                <Text color="yellow">💰 Value: {stats.value} gold </Text>
              )}
            </Box>
          </Box>
        );
    }
  };

  if (items.length === 0) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="yellow">
          {title}
        </Text>
        <Text color="gray">No items to display</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="cyan">
        {title}
      </Text>
      <Text color="gray">─────────────────────────────────────────────</Text>

      {items.map((item, index) => (
        <Box key={item.id || index} flexDirection="column" marginTop={1}>
          <Box>
            <Text color={getTierColor(item.tier)}>
              {getTierSymbol(item.tier)}
            </Text>
            <Text bold color="white">
              {" "}
              {item.name}
            </Text>
            <Text color="gray"> ({item.subType})</Text>
          </Box>

          <Box marginLeft={2}>
            <Text color="blue">Tier: </Text>
            <Text color={getTierColor(item.tier)}>{item.tier}</Text>
            <Text color="blue"> | Rarity: </Text>
            <Text color="yellow">{item.rarity}%</Text>
          </Box>

          <Box marginLeft={2}>
            <Text color="magenta">Rarity: </Text>
            <Text color="yellow">{getRarityBar(item.rarity)}</Text>
            <Text color="yellow"> {item.rarity}%</Text>
          </Box>

          <Box marginLeft={2} marginTop={1}>
            <Text color="green" wrap="wrap">
              {item.description}
            </Text>
          </Box>

          {renderStats(item)}

          {/* Base stats (durability, weight, value) */}
          {(item.stats.durability || item.stats.weight || item.stats.value) && (
            <Box flexDirection="column" marginLeft={2} marginTop={1}>
              <Text color="gray">Base Properties:</Text>
              <Box marginLeft={2}>
                {item.stats.durability && (
                  <Text color="gray">
                    🔧 Durability: {item.stats.durability}{" "}
                  </Text>
                )}
                {item.stats.weight && (
                  <Text color="gray">
                    ⚖️ Weight: {formatStatValue(item.stats.weight, "kg")}{" "}
                  </Text>
                )}
                {item.stats.value && (
                  <Text color="yellow">💰 Value: {item.stats.value} gold </Text>
                )}
              </Box>
            </Box>
          )}

          {item.magicalProperties && item.magicalProperties.length > 0 && (
            <Box marginLeft={2} marginTop={1}>
              <Text color="purple">Magical Properties:</Text>
              {item.magicalProperties.map((prop, i) => (
                <Box key={i} marginLeft={2}>
                  <Text color="magenta">✨ {prop.name}</Text>
                  {prop.magnitude && (
                    <Text color="white"> ({prop.magnitude})</Text>
                  )}
                  <Box marginLeft={2}>
                    <Text color="white">{prop.description}</Text>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {item.lore && (
            <Box marginLeft={2} marginTop={1}>
              <Text color="gray" italic>
                "{item.lore}"
              </Text>
            </Box>
          )}

          {item.setName && (
            <Box marginLeft={2} marginTop={1}>
              <Text color="purple">Set: {item.setName}</Text>
            </Box>
          )}

          <Text color="gray">
            ─────────────────────────────────────────────
          </Text>
        </Box>
      ))}
    </Box>
  );
};
