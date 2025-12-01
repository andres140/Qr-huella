"use client";

import { useTheme } from "next-themes@0.4.6";
import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#1f2937",
          "--normal-border": "#e5e7eb",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
