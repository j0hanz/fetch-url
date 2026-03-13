import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import HomeClient from "@/components/home-client";
import ThemeToggle from "@/components/theme-toggle";

export default function Home() {
  return (
    <Box sx={{ minHeight: "100dvh", py: { xs: 3, sm: 5, md: 8 } }}>
      <Container maxWidth="md">
        <Stack spacing={{ xs: 2.5, sm: 4 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <div>
              <Typography variant="h4" component="h1" fontWeight="bold">
                Page Converter
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Turn web pages into clean Markdown
              </Typography>
            </div>
            <ThemeToggle />
          </Stack>

          <HomeClient />
        </Stack>
      </Container>
    </Box>
  );
}
