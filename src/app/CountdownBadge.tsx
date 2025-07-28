import { useEffect, useState } from "react";
import { Badge } from "@chakra-ui/react";

const CountdownBadge = () => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const target = new Date("2025-04-25T20:00:00Z").getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        clearInterval(interval);
        setIsLive(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(
        `${String(days).padStart(2, "0")}d ${String(hours).padStart(2, "0")}h ${String(
          minutes
        ).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Badge
      colorScheme={isLive ? "red" : "purple"}
      fontSize="sm"
      fontWeight="bold"
      px={3}
      py={1}
      borderRadius="full"
    >
      {isLive ? "Mint Closed" : timeLeft}
    </Badge>
  );
};

export default CountdownBadge;
