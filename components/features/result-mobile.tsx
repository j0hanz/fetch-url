'use client';

import type { ReactNode, SyntheticEvent } from 'react';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Fab from '@mui/material/Fab';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import {
  CopyFeedbackSnackbar,
  getResultViewPanelId,
  getResultViewTabId,
  RESULT_VIEW_MODE_OPTIONS,
  ResultHeaderWithDetails,
  ResultViewContent,
  useResultDocumentActions,
  type ViewMode,
} from '@/components/features/result-content';
import { BaseDialog } from '@/components/ui/dialog';

import type { TransformResult } from '@/lib/api';
import { fluid, sx, tokens } from '@/lib/theme';

const MOBILE_RESULT_BAR_SX = {
  ...sx.markdownPanel,
  position: 'relative',
  display: 'block',
  textAlign: 'left',
  border: 1,
  borderColor: 'divider',
  width: '100%',
  minHeight: fluid.panelMaxHeight,
  overflow: 'hidden',
  borderRadius: tokens.radius.panel,
  cursor: 'pointer',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 'auto 0 0 0',
    height: '50%',
    background:
      'linear-gradient(to bottom, transparent, var(--mui-palette-background-default))',
    pointerEvents: 'none',
  },
} as const;
const MOBILE_RESULT_FAB_SX = {
  position: 'absolute',
  bottom: 75,
  right: 15,
  zIndex: 1,
  gap: 1,
  display: 'flex',
  flexDirection: 'column',
} as const;

function MobileResultTabPanel({
  children,
  tab,
  visible,
}: {
  children: ReactNode;
  tab: ViewMode;
  visible: boolean;
}) {
  return (
    <div
      role="tabpanel"
      hidden={!visible}
      id={getResultViewPanelId(tab)}
      aria-labelledby={getResultViewTabId(tab)}
    >
      {children}
    </div>
  );
}

function MobileResultBar({
  markdown,
  onOpen,
}: {
  markdown: string;
  onOpen: () => void;
}) {
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label="View result"
      component="div"
      sx={MOBILE_RESULT_BAR_SX}
    >
      <ResultViewContent markdown={markdown} viewMode="preview" />
    </ButtonBase>
  );
}

function MobileResultFab({ result }: { result: TransformResult }) {
  const documentActions = useResultDocumentActions(result);

  return (
    <>
      <Box sx={MOBILE_RESULT_FAB_SX}>
        <Fab
          size="small"
          color={documentActions.copyStatusColor}
          onClick={documentActions.handleCopyMarkdown}
          aria-label="Copy Markdown"
        >
          <ContentCopyIcon fontSize="small" />
        </Fab>
        <Fab
          size="small"
          onClick={documentActions.handleDownload}
          aria-label="Download Markdown"
        >
          <Badge variant="dot" color="warning" invisible={!result.truncated}>
            <DownloadIcon fontSize="small" />
          </Badge>
        </Fab>
      </Box>

      <CopyFeedbackSnackbar
        open={documentActions.copyFeedbackOpen}
        onClose={documentActions.clearCopyFeedback}
        message={documentActions.copyStatusMessage}
      />
    </>
  );
}

function MobileResultDialogHeader({
  onTabChange,
  viewMode,
}: {
  onTabChange: (event: SyntheticEvent, nextTab: ViewMode) => void;
  viewMode: ViewMode;
}) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs
        value={viewMode}
        onChange={onTabChange}
        variant="fullWidth"
        aria-label="Result view tabs"
      >
        {RESULT_VIEW_MODE_OPTIONS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            id={getResultViewTabId(tab.value)}
            aria-controls={getResultViewPanelId(tab.value)}
          />
        ))}
      </Tabs>
    </Box>
  );
}

function MobileResultDialogPanels({
  result,
  viewMode,
}: {
  result: TransformResult;
  viewMode: ViewMode;
}) {
  return (
    <>
      {RESULT_VIEW_MODE_OPTIONS.map((option) => (
        <MobileResultTabPanel
          key={option.value}
          tab={option.value}
          visible={viewMode === option.value}
        >
          <ResultViewContent
            markdown={result.markdown}
            viewMode={option.value}
          />
        </MobileResultTabPanel>
      ))}
    </>
  );
}

function MobileResultDialog({
  open,
  onClose,
  result,
  viewMode,
  onTabChange,
}: {
  open: boolean;
  onClose: () => void;
  result: TransformResult;
  viewMode: ViewMode;
  onTabChange: (event: SyntheticEvent, nextTab: ViewMode) => void;
}) {
  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      titleId="mobile-result-dialog-title"
      title={result.title ?? 'Result'}
      hiddenTitle
      fullScreen
      header={
        <MobileResultDialogHeader
          viewMode={viewMode}
          onTabChange={onTabChange}
        />
      }
    >
      <MobileResultDialogPanels result={result} viewMode={viewMode} />
      <MobileResultFab result={result} />
    </BaseDialog>
  );
}

export default function ResultMobile({
  mobileDialogOpen,
  onClose,
  onOpen,
  onTabChange,
  result,
  viewMode,
}: {
  mobileDialogOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onTabChange: (event: SyntheticEvent, nextTab: ViewMode) => void;
  result: TransformResult;
  viewMode: ViewMode;
}) {
  return (
    <Stack spacing={2}>
      <ResultHeaderWithDetails result={result} />
      {!mobileDialogOpen ? (
        <MobileResultBar markdown={result.markdown} onOpen={onOpen} />
      ) : null}
      {mobileDialogOpen ? (
        <MobileResultDialog
          open
          onClose={onClose}
          result={result}
          viewMode={viewMode}
          onTabChange={onTabChange}
        />
      ) : null}
    </Stack>
  );
}
