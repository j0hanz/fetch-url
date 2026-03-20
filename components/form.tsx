"use client";

import { useId, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

interface TransformFormProps {
  loading: boolean;
  onCancel: () => void;
  onSubmit: (url: string) => void;
}

const URL_INPUT_SX = { flexGrow: 1, flex: { md: "2 1 0" } } as const;
const ACTION_BUTTON_SX = {
  maxWidth: { sm: 150 },
  flex: { md: "1 1 0" },
} as const;

export default function TransformForm({
  loading,
  onCancel,
  onSubmit,
}: TransformFormProps) {
  const urlInputId = useId();
  const [url, setUrl] = useState("");

  function handleUrlChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUrl(event.target.value);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(url);
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          id={urlInputId}
          label="Paste a public URL to convert"
          type="url"
          required
          fullWidth
          placeholder="https://example.com"
          value={url}
          onChange={handleUrlChange}
          disabled={loading}
          variant="outlined"
          size="small"
          sx={URL_INPUT_SX}
        />
        {loading ? (
          <Button
            type="button"
            variant="contained"
            fullWidth
            color="error"
            onClick={onCancel}
            sx={ACTION_BUTTON_SX}
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={ACTION_BUTTON_SX}
          >
            Convert
          </Button>
        )}
      </Stack>
    </Box>
  );
}
