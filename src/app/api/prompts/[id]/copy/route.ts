import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/prompts/[id]/copy - Track copy action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const prompt = await prisma.prompt.findUnique({ where: { id } });

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

    // Increment copy count
    const updatedPrompt = await prisma.prompt.update({
      where: { id },
      data: { copyCount: { increment: 1 } },
    });

    // Update author's total copies
    if (prompt.authorId) {
      await prisma.user.update({
        where: { id: prompt.authorId },
        data: { totalCopies: { increment: 1 } },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        copyCount: updatedPrompt.copyCount,
      },
    });
  } catch (error) {
    console.error("Error tracking copy:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to track copy",
        },
      },
      { status: 500 }
    );
  }
}
