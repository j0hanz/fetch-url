"use client";

import { useColorScheme } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";

type Mode = "light" | "dark" | "system";

const MODE_CYCLE: Record<Mode, Mode> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const MODE_ICON: Record<Mode, typeof DarkModeIcon> = {
  light: LightModeIcon,
  dark: DarkModeIcon,
  system: SettingsBrightnessIcon,
};

const MODE_LABEL: Record<Mode, string> = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System mode",
};
const THEME_ICON_SX = { fontSize: { xs: "1.25rem", sm: "1.5rem" } } as const;

function isMode(value: string | undefined): value is Mode {
  return value === "light" || value === "dark" || value === "system";
}

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();

  if (!isMode(mode)) {
    return null;
  }

  const nextMode = MODE_CYCLE[mode];
  const nextLabel = MODE_LABEL[nextMode];
  const Icon = MODE_ICON[mode];
  const actionLabel = `Switch to ${nextLabel.toLowerCase()}`;

  return (
    <Tooltip title={actionLabel}>
      <IconButton
        onClick={() => setMode(nextMode)}
        aria-label={actionLabel}
        size="small"
      >
        <Icon sx={THEME_ICON_SX} />
      </IconButton>
    </Tooltip>
  );
}
