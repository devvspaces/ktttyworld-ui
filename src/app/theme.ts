import { extendTheme } from "@chakra-ui/react";

export const theme = extendTheme({
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false,
  },
  fonts: {
    heading: "var(--font-space-grotesk)",
    body: "var(--font-inter)",
  },
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === "dark" ? "#0f172a" : "#f8fafc",
        color: props.colorMode === "dark" ? "#f1f5f9" : "#334155",
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: "xl",
        fontWeight: "semibold",
      },
      variants: {
        primary: (props: { colorMode: string }) => ({
          bg: props.colorMode === "dark" ? "purple.500" : "purple.600",
          color: "white",
          _hover: {
            bg: props.colorMode === "dark" ? "purple.400" : "purple.500",
            transform: "translateY(-2px)",
            boxShadow: "lg",
          },
          transition: "all 0.2s ease-in-out",
        }),
        secondary: (props: { colorMode: string }) => ({
          bg: props.colorMode === "dark" ? "#1e293b" : "#e2e8f0",
          color: props.colorMode === "dark" ? "#f1f5f9" : "#334155",
          _hover: {
            bg: props.colorMode === "dark" ? "#334155" : "#cbd5e1",
            transform: "translateY(-2px)",
            boxShadow: "md",
          },
          transition: "all 0.2s ease-in-out",
        }),
      },
    },
  },
});
