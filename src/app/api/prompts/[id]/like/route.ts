import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/prompts/[id]/like - Toggle like on a prompt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to like prompts",
          },
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Find the prompt
    const prompt = await prisma.prompt.findUnique({
      where: { id },
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

    // Check if user already liked this prompt
    const existingLike = await prisma.like.findUnique({
      where: {
        uniqueLike: {
          userId: user.id,
          promptId: id,
        },
      },
    });

    let liked: boolean;
    let newLikeCount: number;

    if (existingLike) {
      // Unlike - remove the like
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      // Decrement like count
      const updatedPrompt = await prisma.prompt.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
      });

      liked = false;
      newLikeCount = updatedPrompt.likeCount;
    } else {
      // Like - create new like
      await prisma.like.create({
        data: {
          userId: user.id,
          promptId: id,
        },
      });

      // Increment like count
      const updatedPrompt = await prisma.prompt.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      });

      liked = true;
      newLikeCount = updatedPrompt.likeCount;

      // Update author's total likes if they exist
      if (prompt.authorId) {
        await prisma.user.update({
          where: { id: prompt.authorId },
          data: { totalLikes: { increment: 1 } },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        liked,
        likeCount: newLikeCount,
      },
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to toggle like",
        },
      },
      { status: 500 }
    );
  }
}

// GET /api/prompts/[id]/like - Check if user liked this prompt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({
        success: true,
        data: { liked: false },
      });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        uniqueLike: {
          userId: user.id,
          promptId: id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { liked: !!existingLike },
    });
  } catch (error) {
    console.error("Error checking like status:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to check like status",
        },
      },
      { status: 500 }
    );
  }
}
