import { ImageResponse } from "next/og";
import {
  LIGHT_SOCIAL_PALETTE,
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

const OG_FEATURES = [
  { label: "Clean extraction", backgroundColor: "#dbeafe" },
  { label: "No account needed", backgroundColor: "#d1fae5" },
  { label: "Markdown export", backgroundColor: "#ede9fe" },
] as const;

export default function OpenGraphImage() {
  return new ImageResponse(
    <SocialImageFrame palette={LIGHT_SOCIAL_PALETTE}>
      <SocialImageContent>
        <SocialEyebrow
          label="Web page to Markdown"
          palette={LIGHT_SOCIAL_PALETTE}
        />
        <SocialTitle>{SITE_NAME}</SocialTitle>
        <SocialBody color={LIGHT_SOCIAL_PALETTE.bodyColor}>
          {SITE_TAGLINE} with live progress, preview, copy, and download.
        </SocialBody>
      </SocialImageContent>

      <SocialFeatureList>
        {OG_FEATURES.map((feature) => (
          <SocialFeaturePill key={feature.label} {...feature} />
        ))}
      </SocialFeatureList>
    </SocialImageFrame>,
    size,
  );
}
