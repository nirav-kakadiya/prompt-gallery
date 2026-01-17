"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Edit, Settings } from "lucide-react";
import { PageLayout, EmptyState } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { PromptCard, PromptCardSkeleton } from "@/components/cards/prompt-card";
import { useAuthStore } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

async function fetchUserPrompts(userId: string) {
  const response = await fetch(`/api/prompts?authorId=${userId}`);
  const data = await response.json();
  return data.success ? data.data : [];
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["user-prompts", user?.id],
    queryFn: () => fetchUserPrompts(user!.id),
    enabled: !!user?.id,
  });

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <PageLayout>
      <div className="py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start gap-6 mb-12"
        >
          <UserAvatar user={user} size="xl" />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{user.name || "Anonymous"}</h1>
                {user.username && (
                  <p className="text-muted-foreground">@{user.username}</p>
                )}
              </div>
              <Link href="/settings">
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{prompts?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Prompts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Following</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* User's Prompts */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Your Prompts</h2>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <PromptCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!isLoading && prompts?.length === 0 && (
            <EmptyState
              icon={<Edit className="w-8 h-8 text-muted-foreground" />}
              title="No prompts yet"
              description="Start sharing your creative prompts with the community"
              action={
                <Link href="/submit">
                  <Button>Submit Your First Prompt</Button>
                </Link>
              }
            />
          )}

          {!isLoading && prompts?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(prompts as Array<Parameters<typeof PromptCard>[0]["prompt"]>).map((prompt, index) => (
                <motion.div
                  key={prompt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PromptCard prompt={prompt} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
