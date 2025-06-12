import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Generating magical loot...",
}) => {
  const [frame, setFrame] = useState(0);

  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prevFrame) => (prevFrame + 1) % frames.length);
    }, 80);

    return () => clearInterval(timer);
  }, [frames.length]);

  return (
    <Box>
      <Text color="cyan">{frames[frame]} </Text>
      <Text color="yellow">{message}</Text>
    </Box>
  );
};
