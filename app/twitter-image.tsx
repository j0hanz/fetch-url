import { ImageResponse } from "next/og";
import {
  DARK_SOCIAL_PALETTE,
  SocialBody,
  SocialEyebrow,
  SocialFeatureList,
  SocialFeaturePill,
  SocialImageContent,
  SocialImageFrame,
  SocialTitle,
} from "@/lib/social-image";
import {
  SITE_NAME,
  SITE_TAGLINE,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_CONTENT_TYPE,
  SOCIAL_IMAGE_SIZE,
} from "@/lib/site";

export const alt = SOCIAL_IMAGE_ALT;
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = SOCIAL_IMAGE_CONTENT_TYPE;

const TWITTER_FEATURES = [
  {
    label: "Preview",
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    color: "#f8fafc",
  },
  {
    label: "Copy",
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    color: "#f8fafc",
  },
  {
    label: "Download",
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    color: "#f8fafc",
  },
] as const;

export default function TwitterImage() {
  return new ImageResponse(
    <SocialImageFrame palette={DARK_SOCIAL_PALETTE}>
      <SocialImageContent maxWidth={860}>
        <SocialEyebrow
          label="Clean web page extraction"
          palette={DARK_SOCIAL_PALETTE}
          variant="outlined"
        />
        <SocialTitle>{SITE_NAME}</SocialTitle>
        <SocialBody color={DARK_SOCIAL_PALETTE.bodyColor}>
          {SITE_TAGLINE} with live progress and ready-to-share Markdown output.
        </SocialBody>
      </SocialImageContent>

      <SocialFeatureList>
        {TWITTER_FEATURES.map((feature) => (
          <SocialFeaturePill key={feature.label} {...feature} />
        ))}
      </SocialFeatureList>
    </SocialImageFrame>,
    size,
  );
}
