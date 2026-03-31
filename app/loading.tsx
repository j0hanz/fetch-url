import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';

export default function Loading() {
  return (
    <Box role="status" aria-label="Loading page">
      <Grid container spacing={1} sx={{ mb: 1.5 }}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <Skeleton variant="rounded" height={40} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Skeleton variant="rounded" height={40} />
        </Grid>
      </Grid>

      <Skeleton variant="rounded" sx={{ flex: 1, minHeight: 200, mt: 2 }} />
    </Box>
  );
}
