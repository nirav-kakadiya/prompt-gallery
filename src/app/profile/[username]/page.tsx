import { Metadata } from "next";
import { PageLayout } from "@/components/layout/page-layout";
import { PromptCard } from "@/components/cards/prompt-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Copy, Eye, Heart, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, username: true },
  });

  if (!user) {
    return { title: "User Not Found" };
  }

  return {
    title: `${user.name || user.username} - Profile`,
    description: `View ${user.name || user.username}'s prompts on Prompt Gallery`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      prompts: {
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          author: { select: { name: true, username: true } },
        },
      },
      _count: {
        select: { prompts: true },
      },
    },
  });

  if (!user) {
    notFound();
  }

  // Calculate stats
  const stats = await prisma.prompt.aggregate({
    where: { authorId: user.id },
    _sum: {
      viewCount: true,
      copyCount: true,
      likeCount: true,
    },
  });

  return (
    <PageLayout>
      <div className="pb-16">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-12">
          <Avatar className="w-24 h-24">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback className="text-2xl">
              {(user.name || user.username || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl font-bold mb-1">{user.name || user.username}</h1>
            <p className="text-muted-foreground mb-3">@{user.username}</p>

            {user.bio && (
              <p className="text-muted-foreground max-w-xl mb-4">{user.bio}</p>
            )}

            <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          <Button variant="outline" disabled>
            <Users className="w-4 h-4 mr-2" />
            Follow
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <div className="p-4 rounded-xl bg-muted/50 text-center">
            <div className="text-2xl font-bold">{user._count.prompts}</div>
            <div className="text-sm text-muted-foreground">Prompts</div>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <Eye className="w-5 h-5" />
              {(stats._sum.viewCount || 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Views</div>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <Copy className="w-5 h-5" />
              {(stats._sum.copyCount || 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Copies</div>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <Heart className="w-5 h-5" />
              {(stats._sum.likeCount || 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Likes</div>
          </div>
        </div>

        {/* User's Prompts */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Prompts by {user.name || user.username}</h2>

          {user.prompts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {user.prompts.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt as unknown as Parameters<typeof PromptCard>[0]["prompt"]} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p>No prompts yet</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
