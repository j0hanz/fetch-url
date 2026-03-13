"use client";

import { useColorScheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
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

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  const isSmUp = useMediaQuery((theme) => theme.breakpoints.up("sm"));

  if (!mode) {
    return null;
  }

  const current = mode as Mode;
  const Icon = MODE_ICON[current];

  return (
    <Tooltip title={MODE_LABEL[current]}>
      <IconButton
        onClick={() => setMode(MODE_CYCLE[current])}
        aria-label={MODE_LABEL[current]}
        size="small"
      >
        <Icon fontSize={isSmUp ? "medium" : "small"} />
      </IconButton>
    </Tooltip>
  );
}
