import { NextResponse } from "next/server";
import { getAvatarStyles, generateAvatarUrl } from "@/lib/profile-utils";

// GET /api/users/avatar-styles - Get available avatar styles with previews
export async function GET() {
  const styles = getAvatarStyles();

  // Generate preview URLs for each style
  const stylesWithPreviews = styles.map(style => ({
    id: style,
    name: style.charAt(0).toUpperCase() + style.slice(1).replace(/-/g, ' '),
    previewUrl: generateAvatarUrl('preview-user', style, 100),
  }));

  return NextResponse.json({
    success: true,
    data: stylesWithPreviews,
  });
}
