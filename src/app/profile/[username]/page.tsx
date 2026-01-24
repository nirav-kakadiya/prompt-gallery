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
  // Case-insensitive lookup for better UX
  const profile = await prisma.profile.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { name: true, username: true },
  });

  if (!profile) {
    return { title: "User Not Found" };
  }

  return {
    title: `${profile.name || profile.username} - Profile`,
    description: `View ${profile.name || profile.username}'s prompts on Prompt Gallery`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;

  // Case-insensitive lookup for better UX (handles /profile/Nirav and /profile/nirav)
  const profile = await prisma.profile.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    include: {
      prompts: {
        where: { status: 'published' }, // Only show published prompts
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50, // Show more prompts on public profile
        include: {
          author: { select: { name: true, username: true, avatarUrl: true } },
          promptTags: { select: { tag: { select: { name: true } } } },
        },
      },
      _count: {
        select: { prompts: { where: { status: 'published' } } },
      },
    },
  });

  if (!profile) {
    notFound();
  }

  // Calculate stats
  const stats = await prisma.prompt.aggregate({
    where: { authorId: profile.id },
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
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-8 sm:mb-12">
          <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
            <AvatarImage src={profile.avatarUrl || undefined} />
            <AvatarFallback className="text-xl sm:text-2xl">
              {(profile.name || profile.username || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">{profile.name || profile.username}</h1>
            <p className="text-muted-foreground mb-3">@{profile.username}</p>

            {profile.bio && (
              <p className="text-muted-foreground max-w-xl mb-4">{profile.bio}</p>
            )}

            <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          <Button variant="outline" disabled>
            <Users className="w-4 h-4 mr-2" />
            Follow
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
          <div className="p-3 sm:p-4 rounded-xl bg-muted/50 text-center">
            <div className="text-xl sm:text-2xl font-bold">{profile._count.prompts}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Prompts</div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-muted/50 text-center">
            <div className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-1">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
              {(stats._sum.viewCount || 0).toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">Views</div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-muted/50 text-center">
            <div className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-1">
              <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
              {(stats._sum.copyCount || 0).toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">Copies</div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-muted/50 text-center">
            <div className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-1">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              {(stats._sum.likeCount || 0).toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">Likes</div>
          </div>
        </div>

        {/* User's Prompts */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Prompts by {profile.name || profile.username}</h2>

          {profile.prompts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {profile.prompts.map((prompt) => (
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
