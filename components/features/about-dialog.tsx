'use client';

import { useState } from 'react';

import dynamic from 'next/dynamic';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { sx } from '@/lib/theme';

const AboutDialogPanel = dynamic(
  () => import('@/components/features/about-dialog-panel')
);

interface AboutDialogProps {
  aboutMarkdown: string;
  howItWorksMarkdown: string;
}

export default function AboutDialog({
  aboutMarkdown,
  howItWorksMarkdown,
}: AboutDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="About">
        <IconButton
          onClick={() => setOpen(true)}
          aria-label="About Fetch URL"
          size="small"
          disableRipple={true}
        >
          <InfoOutlinedIcon sx={sx.headerIcon} />
        </IconButton>
      </Tooltip>

      {open ? (
        <AboutDialogPanel
          aboutMarkdown={aboutMarkdown}
          howItWorksMarkdown={howItWorksMarkdown}
          open={open}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
