"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export default function AboutDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="About">
        <IconButton
          onClick={() => setOpen(true)}
          size="small"
          aria-label="About Page Converter"
        >
          <InfoOutlinedIcon fontSize="small" sx={{ display: { sm: "none" } }} />
          <InfoOutlinedIcon sx={{ display: { xs: "none", sm: "block" } }} />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="about-dialog-title"
        aria-describedby="about-dialog-description"
      >
        <DialogTitle id="about-dialog-title">About Page Converter</DialogTitle>
        <DialogContent>
          <DialogContentText id="about-dialog-description">
            Page Converter turns any public web page into clean, readable
            Markdown. Paste a URL, hit convert, and get well-formatted Markdown
            ready for docs, notes, or further processing.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
