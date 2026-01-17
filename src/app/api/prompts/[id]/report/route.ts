import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/prompts/[id]/report - Report a prompt
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reason, details } = body;

    // Validate reason
    const validReasons = ["spam", "inappropriate", "copyright", "other"];
    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REASON",
            message: "Please select a valid reason for the report",
          },
        },
        { status: 400 }
      );
    }

    // Verify prompt exists
    const prompt = await prisma.prompt.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Prompt not found",
          },
        },
        { status: 404 }
      );
    }

    // Get current user (optional)
    const user = await getCurrentUser();

    // Rate limiting: Check if same user/IP has reported this prompt recently
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existingReport = await prisma.report.findFirst({
      where: {
        promptId: id,
        ...(user ? { userId: user.id } : {}),
        createdAt: { gte: oneHourAgo },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALREADY_REPORTED",
            message: "You have already reported this prompt recently",
          },
        },
        { status: 429 }
      );
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        promptId: id,
        userId: user?.id || null,
        reason,
        details: details?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        message: "Thank you for your report. We will review it shortly.",
      },
    });
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to submit report",
        },
      },
      { status: 500 }
    );
  }
}
