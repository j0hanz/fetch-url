'use client';

import {
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
  useState,
} from 'react';

import CodeIcon from '@mui/icons-material/Code';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import { BaseDialog } from '@/components/ui/dialog';
import { MarkdownErrorBoundary } from '@/components/ui/error';
import MarkdownPreview from '@/components/ui/markdown-preview';

import { type CopyStatus, useFeedback } from '@/hooks/use-feedback';
import { usePreview } from '@/hooks/use-preview';

import type { TransformResult } from '@/lib/api';
import { sx, tokens } from '@/lib/theme';

interface TransformResultProps {
  result: TransformResult;
}

type ViewMode = 'preview' | 'code';
type IconButtonColor = ComponentProps<typeof IconButton>['color'];

interface PreviewTransitionState {
  isPending: boolean;
  previewTransitionDuration: number;
  previewMarkdown: string;
}

interface ResultActionButtonProps {
  ariaLabel: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
  color?: IconButtonColor;
}

interface ResultDetailItem {
  label: string;
  value: ReactNode;
}

const CONFIG = {
  COPY_FEEDBACK_DELAY_MS: 2000,
  DEFAULT_DOWNLOAD_FILE_NAME: 'page',
  MAX_DOWNLOAD_FILE_NAME_LENGTH: 96,
} as const;
const INVALID_DOWNLOAD_FILE_NAME_CHARACTERS = new Set([
  '<',
  '>',
  ':',
  '"',
  '/',
  '\\',
  '|',
  '?',
  '*',
]);

const VIEW_MODE_OPTIONS = [
  {
    icon: <VisibilityIcon fontSize="small" />,
    label: 'Preview',
    value: 'preview',
  },
  {
    icon: <CodeIcon fontSize="small" />,
    label: 'Code',
    value: 'code',
  },
] as const satisfies readonly {
  icon: ReactNode;
  label: string;
  value: ViewMode;
}[];

const COPY_STATUS_DETAILS: Record<
  CopyStatus,
  { color: IconButtonColor; message?: string }
> = {
  idle: { color: 'default' },
  copied: { color: 'success', message: 'Copied to clipboard' },
  failed: { color: 'error', message: 'Failed to copy' },
};

function isSafeImageUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeDownloadFileName(title: string | undefined): string {
  let normalizedTitle = '';

  for (const character of title ?? '') {
    const isControlCharacter = character.charCodeAt(0) < 32;
    normalizedTitle +=
      isControlCharacter || INVALID_DOWNLOAD_FILE_NAME_CHARACTERS.has(character)
        ? ' '
        : character;
  }

  const sanitized = normalizedTitle
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, CONFIG.MAX_DOWNLOAD_FILE_NAME_LENGTH)
    .trim()
    .replace(/[. ]+$/g, '');

  return sanitized || CONFIG.DEFAULT_DOWNLOAD_FILE_NAME;
}

function downloadMarkdownFile(title: string | undefined, markdown: string) {
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${sanitizeDownloadFileName(title)}.md`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Defer cleanup so the browser can initiate the download before
  // the blob URL is revoked and the anchor is removed from the DOM.
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 0);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function createResultDetailItems({
  contentSize,
  metadata,
  truncated,
  url,
}: TransformResult): ResultDetailItem[] {
  const items: ResultDetailItem[] = [{ label: 'URL:', value: url }];

  if (metadata.description) {
    items.push({ label: 'Info:', value: metadata.description });
  }

  items.push({ label: 'Size:', value: formatBytes(contentSize) });

  if (truncated) {
    items.push({ label: 'Truncated:', value: 'Yes' });
  }

  return items;
}

function ResultActionButton({
  ariaLabel,
  title,
  onClick,
  children,
  color = 'default',
}: ResultActionButtonProps) {
  return (
    <Tooltip title={title}>
      <IconButton aria-label={ariaLabel} onClick={onClick} color={color}>
        {children}
      </IconButton>
    </Tooltip>
  );
}

function PreviewSurface({
  markdown,
  previewState,
}: {
  markdown: string;
  previewState: PreviewTransitionState;
}) {
  const { isPending, previewTransitionDuration } = previewState;

  return (
    <Box
      aria-busy={isPending || undefined}
      sx={{
        opacity: isPending ? 0.72 : 1,
        transition: `opacity ${previewTransitionDuration}ms linear`,
      }}
    >
      <MarkdownPreview>{markdown}</MarkdownPreview>
    </Box>
  );
}

function ResultMarkdownPanel({
  isPreviewMode,
  markdown,
  previewState,
}: {
  isPreviewMode: boolean;
  markdown: string;
  previewState: PreviewTransitionState;
}) {
  return (
    <Paper sx={sx.markdownPanel}>
      <Box sx={{ display: isPreviewMode ? 'block' : 'none' }}>
        <MarkdownErrorBoundary resetKey={markdown}>
          <PreviewSurface
            markdown={previewState.previewMarkdown}
            previewState={previewState}
          />
        </MarkdownErrorBoundary>
      </Box>
      <Box sx={{ display: !isPreviewMode ? 'block' : 'none' }}>
        <Typography component="pre" variant="body2" sx={sx.rawMarkdown}>
          {markdown}
        </Typography>
      </Box>
    </Paper>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack direction="row" gap={2}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word', minWidth: 0 }}>
        {value}
      </Typography>
    </Stack>
  );
}

interface ResultDetailDialogProps {
  open: boolean;
  onClose: () => void;
  result: TransformResult;
}

function ResultDetailDialog({
  open,
  onClose,
  result,
}: ResultDetailDialogProps) {
  const { metadata, title } = result;
  const detailItems = createResultDetailItems(result);

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      titleId="result-detail-title"
      title={
        <Typography variant="subtitle1" sx={{ minWidth: 0 }}>
          {title ?? 'Page Details'}
        </Typography>
      }
      maxWidth="sm"
    >
      <Stack gap={2}>
        {detailItems.map((item) => (
          <DetailRow key={item.label} label={item.label} value={item.value} />
        ))}
        {isSafeImageUrl(metadata.image) && (
          <Box
            component="img"
            src={metadata.image}
            alt="Page preview"
            loading="lazy"
            decoding="async"
            sx={{ maxWidth: '100%', borderRadius: 1 }}
          />
        )}
      </Stack>
    </BaseDialog>
  );
}

function ResultHeaderButtonContent({ result }: TransformResultProps) {
  const { metadata, title, url } = result;

  return (
    <Stack direction="row" gap={1.5} alignItems="center">
      <Avatar
        src={isSafeImageUrl(metadata.favicon) ? metadata.favicon : undefined}
        sx={{
          width: tokens.sizes.avatar,
          height: tokens.sizes.avatar,
        }}
        alt={title ?? url}
        variant="square"
      >
        {title?.[0]}
      </Avatar>
      <Stack sx={{ minWidth: 0 }}>
        {title && (
          <Typography variant="body2" sx={sx.truncatedText} noWrap>
            {title}
          </Typography>
        )}
        <Typography variant="caption" sx={sx.resultUrl} noWrap>
          {url}
        </Typography>
      </Stack>
    </Stack>
  );
}

function ResultHeaderWithDetails({ result }: TransformResultProps) {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  return (
    <>
      <Box sx={sx.transitionCell}>
        <Tooltip title="View page details">
          <ButtonBase
            onClick={() => {
              setDetailDialogOpen(true);
            }}
            disableRipple={true}
            sx={sx.headerButton}
            aria-label="View page details"
          >
            <ResultHeaderButtonContent result={result} />
          </ButtonBase>
        </Tooltip>
      </Box>
      <ResultDetailDialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
        }}
        result={result}
      />
    </>
  );
}

interface ResultActionBarProps {
  viewMode: ViewMode;
  onViewModeChange: (
    event: MouseEvent<HTMLElement>,
    newMode: ViewMode | null
  ) => void;
  result: TransformResult;
}

function ResultActionBar({
  viewMode,
  onViewModeChange,
  result,
}: ResultActionBarProps) {
  const { clearCopyFeedback, copyFeedbackOpen, copyStatus, handleCopy } =
    useFeedback();
  const copyStatusDetails = COPY_STATUS_DETAILS[copyStatus];

  function handleDownload() {
    downloadMarkdownFile(result.title, result.markdown);
  }

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ flexWrap: 'wrap', gap: 1 }}
      >
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={onViewModeChange}
          size="small"
          aria-label="View mode"
        >
          {VIEW_MODE_OPTIONS.map((option) => (
            <ToggleButton
              key={option.value}
              sx={sx.toggleButton}
              value={option.value}
              aria-label={option.label}
            >
              {option.icon}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Stack direction="row" spacing={1}>
          <ResultActionButton
            ariaLabel="Copy Markdown"
            title="Copy Markdown"
            onClick={() => handleCopy(result.markdown)}
            color={copyStatusDetails.color}
          >
            <ContentCopyIcon fontSize="small" />
          </ResultActionButton>
          <ResultActionButton
            ariaLabel="Download Markdown"
            title="Download Markdown"
            onClick={handleDownload}
          >
            <Badge variant="dot" color="warning" invisible={!result.truncated}>
              <DownloadIcon fontSize="small" />
            </Badge>
          </ResultActionButton>
        </Stack>
      </Stack>

      <Snackbar
        open={copyFeedbackOpen}
        autoHideDuration={CONFIG.COPY_FEEDBACK_DELAY_MS}
        onClose={clearCopyFeedback}
        message={copyStatusDetails.message}
      />
    </>
  );
}

// ── Mobile sub-components (xs only, < sm breakpoint) ───────────

const MOBILE_TABS = [
  {
    id: 'preview',
    label: 'Preview',
    panelId: 'result-tabpanel-preview',
    tabId: 'result-tab-preview',
  },
  {
    id: 'code',
    label: 'Code',
    panelId: 'result-tabpanel-code',
    tabId: 'result-tab-code',
  },
] as const satisfies readonly {
  id: ViewMode;
  label: string;
  panelId: string;
  tabId: string;
}[];

function MobileResultTabPanel({
  children,
  tab,
  visible,
}: {
  children: ReactNode;
  tab: ViewMode;
  visible: boolean;
}) {
  const definition = MOBILE_TABS.find((t) => t.id === tab) ?? MOBILE_TABS[0];

  return (
    <div
      role="tabpanel"
      hidden={!visible}
      id={definition.panelId}
      aria-labelledby={definition.tabId}
    >
      {visible ? children : null}
    </div>
  );
}

function MobileResultBar({
  markdown,
  previewState,
  onOpen,
}: {
  markdown: string;
  previewState: PreviewTransitionState;
  onOpen: () => void;
}) {
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label="View result"
      component="div"
      sx={sx.mobileResultBar}
    >
      <MarkdownErrorBoundary resetKey={markdown}>
        <PreviewSurface
          markdown={previewState.previewMarkdown}
          previewState={previewState}
        />
      </MarkdownErrorBoundary>
    </ButtonBase>
  );
}

interface MobileResultDialogProps {
  open: boolean;
  onClose: () => void;
  result: TransformResult;
  viewMode: ViewMode;
  onTabChange: (event: SyntheticEvent, nextTab: ViewMode) => void;
  previewState: PreviewTransitionState;
}

function MobileResultDialog({
  open,
  onClose,
  result,
  viewMode,
  onTabChange,
  previewState,
}: MobileResultDialogProps) {
  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      titleId="mobile-result-dialog-title"
      title={result.title ?? 'Result'}
      hiddenTitle
      fullScreen
      header={
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={viewMode}
            onChange={onTabChange}
            variant="fullWidth"
            aria-label="Result view tabs"
          >
            {MOBILE_TABS.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={tab.label}
                id={tab.tabId}
                aria-controls={tab.panelId}
              />
            ))}
          </Tabs>
        </Box>
      }
    >
      <MobileResultTabPanel tab="preview" visible={viewMode === 'preview'}>
        <MarkdownErrorBoundary resetKey={result.markdown}>
          <PreviewSurface
            markdown={previewState.previewMarkdown}
            previewState={previewState}
          />
        </MarkdownErrorBoundary>
      </MobileResultTabPanel>
      <MobileResultTabPanel tab="code" visible={viewMode === 'code'}>
        <Typography component="pre" variant="body2" sx={sx.rawMarkdown}>
          {result.markdown}
        </Typography>
      </MobileResultTabPanel>
      <MobileResultFab result={result} />
    </BaseDialog>
  );
}

function MobileResultFab({ result }: { result: TransformResult }) {
  const { clearCopyFeedback, copyFeedbackOpen, copyStatus, handleCopy } =
    useFeedback();
  const copyStatusDetails = COPY_STATUS_DETAILS[copyStatus];

  function handleDownload() {
    downloadMarkdownFile(result.title, result.markdown);
  }

  return (
    <>
      <Box sx={sx.mobileResultFab}>
        <Fab
          size="small"
          color={
            copyStatusDetails.color === 'default'
              ? 'default'
              : copyStatusDetails.color
          }
          onClick={() => handleCopy(result.markdown)}
          aria-label="Copy Markdown"
        >
          <ContentCopyIcon fontSize="small" />
        </Fab>
        <Fab
          size="small"
          onClick={handleDownload}
          aria-label="Download Markdown"
        >
          <Badge variant="dot" color="warning" invisible={!result.truncated}>
            <DownloadIcon fontSize="small" />
          </Badge>
        </Fab>
      </Box>

      <Snackbar
        open={copyFeedbackOpen}
        autoHideDuration={CONFIG.COPY_FEEDBACK_DELAY_MS}
        onClose={clearCopyFeedback}
        message={copyStatusDetails.message}
      />
    </>
  );
}

export default function TransformResultPanel({ result }: TransformResultProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);
  const previewState = usePreview(result.markdown);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  function handleViewModeChange(
    _event: MouseEvent<HTMLElement>,
    nextViewMode: ViewMode | null
  ): void {
    if (nextViewMode === null) {
      return;
    }

    setViewMode(nextViewMode);
  }

  function handleTabChange(_event: SyntheticEvent, nextTab: ViewMode) {
    setViewMode(nextTab);
  }

  if (isMobile) {
    return (
      <Stack spacing={2}>
        <ResultHeaderWithDetails result={result} />
        <MobileResultBar
          markdown={result.markdown}
          previewState={previewState}
          onOpen={() => {
            setMobileDialogOpen(true);
          }}
        />
        <MobileResultDialog
          open={mobileDialogOpen}
          onClose={() => {
            setMobileDialogOpen(false);
          }}
          result={result}
          viewMode={viewMode}
          onTabChange={handleTabChange}
          previewState={previewState}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <ResultHeaderWithDetails result={result} />

      <Stack
        gap={0.2}
        component="section"
        sx={{ containerType: 'inline-size' }}
      >
        <ResultActionBar
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          result={result}
        />
        <ResultMarkdownPanel
          isPreviewMode={viewMode === 'preview'}
          markdown={result.markdown}
          previewState={previewState}
        />
      </Stack>
    </Stack>
  );
}
