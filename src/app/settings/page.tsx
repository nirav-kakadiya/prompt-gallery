"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Lock, Palette, Key, Loader2, Check, AlertCircle } from "lucide-react";
import { PageLayout, PageHeader } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { useAuthStore } from "@/hooks/use-auth";
import { usePreferencesStore } from "@/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Lock },
  { id: "preferences", label: "Preferences", icon: Palette },
  { id: "api", label: "API Keys", icon: Key },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, setUser } = useAuthStore();
  const { theme, setTheme } = usePreferencesStore();
  const [activeTab, setActiveTab] = React.useState("profile");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = React.useState(false);
  const [profileData, setProfileData] = React.useState({
    name: "",
    username: "",
    bio: "",
  });
  const [passwordData, setPasswordData] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = React.useState("");

  // Load user data when user changes
  React.useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        username: user.username || "",
        bio: user.bio || "",
      });
    }
  }, [user]);

  // Fetch full profile data on mount
  React.useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/users/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setProfileData({
              name: data.data.name || "",
              username: data.data.username || "",
              bio: data.data.bio || "",
            });
            // Update auth store with fresh data
            setUser(data.data);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, setUser]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      const result = await response.json();

      if (result.success) {
        toast.success("Profile updated successfully!");
        // Update local auth store
        setUser(result.data);
      } else {
        toast.error(result.error?.message || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    // Validate
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setIsPasswordLoading(true);
    try {
      const response = await fetch("/api/users/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordData),
      });
      const result = await response.json();

      if (result.success) {
        toast.success("Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setPasswordError(result.error?.message || "Failed to change password");
      }
    } catch {
      setPasswordError("Failed to change password");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <PageLayout>
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <div className="flex flex-col lg:flex-row gap-8 pb-16">
        {/* Sidebar */}
        <div className="lg:w-64 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all border",
                  activeTab === tab.id
                    ? "bg-secondary border-border text-foreground font-medium"
                    : "border-transparent hover:bg-muted text-muted-foreground"
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {activeTab === "profile" && (
              <>
                <div className="flex items-center gap-4">
                  <UserAvatar user={user} size="xl" />
                  <div>
                    <Button variant="outline" disabled>
                      Change Avatar
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avatar upload coming soon
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      placeholder="Your display name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Username</label>
                    <Input
                      value={profileData.username}
                      onChange={(e) =>
                        setProfileData({ ...profileData, username: e.target.value })
                      }
                      placeholder="username"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      3-30 characters. Letters, numbers, underscores, and hyphens only.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData({ ...profileData, bio: e.target.value })
                      }
                      placeholder="Tell us about yourself"
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <Button onClick={handleSaveProfile} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </>
            )}

            {activeTab === "account" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Email Address</h3>
                  <Input value={user.email} disabled />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Contact support to change your email address
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                  {passwordError && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {passwordError}
                    </div>
                  )}
                  <div className="space-y-4">
                    <Input
                      type="password"
                      placeholder="Current password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                    />
                    <Input
                      type="password"
                      placeholder="New password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                    />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                    />
                    <Button
                      onClick={handleChangePassword}
                      disabled={isPasswordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    >
                      {isPasswordLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Lock className="w-4 h-4 mr-2" />
                      )}
                      Update Password
                    </Button>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold text-destructive mb-4">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you delete your account, there is no going back. All your prompts and data will be permanently deleted.
                  </p>
                  <Button variant="destructive" disabled>
                    Delete Account
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Account deletion coming soon
                  </p>
                </div>
              </div>
            )}

            {activeTab === "preferences" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Theme</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose your preferred color scheme
                  </p>
                  <div className="flex gap-2">
                    {(["light", "dark", "system"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border",
                          theme === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-input hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {theme === t && <Check className="w-4 h-4" />}
                        <span className="capitalize">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "api" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">API Keys</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate API keys to access the Prompt Gallery API from your applications.
                  </p>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      API key management coming soon. Check back later!
                    </p>
                    <Button disabled>Generate New Key</Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
}
