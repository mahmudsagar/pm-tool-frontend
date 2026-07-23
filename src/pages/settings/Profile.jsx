import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Loader2 } from "lucide-react";
import useAuthStore from "@/stores/useAuthStore";
import { api } from "@/utils/api";
import { baseUrl, mediaEndpoint } from "@/utils/constants";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export default function ProfileSettings() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef(null);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Keep local form in sync when auth store user updates (e.g. after auth init)
  useEffect(() => {
    if (user?.avatar !== undefined) setAvatar(user.avatar || "");
    if (user?.name !== undefined) setName(user.name || "");
    if (user?.phone !== undefined) setPhone(user.phone || "");
  }, [user?.avatar, user?.name, user?.phone]);

  const clearPendingImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    setReviewOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setMessage({ type: "error", text: "Only JPG and PNG images are allowed" });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setMessage({ type: "error", text: "Image must be 10MB or smaller" });
      e.target.value = "";
      return;
    }

    setMessage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setPreviewUrl(url);
    setReviewOpen(true);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile || !user?._id) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", pendingFile);
      fd.append("media_type", "icon");
      fd.append("reference_id", user._id);
      fd.append("reference_for", "user");
      fd.append("caption", " ");

      const result = await api.upload(`${baseUrl}${mediaEndpoint}`, fd);
      const url = result?.data?.url;
      if (result?.status === "success" && url) {
        // Persist on user profile as well (media upload already sets avatar; keep store in sync)
        await api.put(`${baseUrl}/v1/user`, {
          name: name || user.name,
          phone: phone || user.phone || "",
          avatar: url,
        }).catch(() => null);

        const nextUser = { ...user, avatar: url };
        setAvatar(url);
        setUser(nextUser);
        clearPendingImage();
        setMessage({ type: "success", text: "Profile photo updated" });
      } else {
        const errMsg =
          result?.message?.[0]?.error?.[0] || "Failed to upload profile photo";
        setMessage({ type: "error", text: errMsg });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.message || "Failed to upload profile photo",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put(`${baseUrl}/v1/user`, { name, phone, avatar });
      if (res.status === "success") {
        setUser({ ...user, name, phone, avatar });
        setMessage({ type: "success", text: "Profile updated successfully" });
      } else {
        setMessage({ type: "error", text: "Failed to update profile" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    setChangingPassword(true);
    setPasswordMessage(null);
    try {
      const res = await api.put(`${baseUrl}/v1/user/password`, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (res.status === "success") {
        setPasswordMessage({ type: "success", text: "Password changed successfully" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const errMsg = res?.message?.[0]?.error?.[0] || "Failed to change password";
        setPasswordMessage({ type: "error", text: errMsg });
      }
    } catch {
      setPasswordMessage({ type: "error", text: "Failed to change password" });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="text-muted-foreground mt-1">Manage your personal information</p>

      <Separator className="my-6" />

      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar key={avatar || "no-avatar"} className="h-16 w-16">
            <AvatarImage src={avatar || undefined} alt={name} />
            <AvatarFallback>{name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <div className="space-y-1.5">
            <Label>Profile photo</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={handlePickImage}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-1.5" />
                {avatar ? "Change photo" : "Upload photo"}
              </Button>
              {avatar && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() => {
                    setAvatar("");
                    setMessage(null);
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">JPG or PNG, up to 10MB</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>
        </div>

        {message && (
          <p className={message.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"}>
            {message.text}
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>

      <Dialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!open && !uploading) clearPendingImage();
          else setReviewOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review profile photo</DialogTitle>
            <DialogDescription>
              Confirm this image looks right before uploading.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div className="h-40 w-40 rounded-full overflow-hidden border bg-muted">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={clearPendingImage}
            >
              Cancel
            </Button>
            <Button type="button" disabled={uploading} onClick={handleConfirmUpload}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Use this photo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Separator className="my-8" />

      <h2 className="text-xl font-semibold">Change Password</h2>
      <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
        <div>
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
        </div>

        {passwordMessage && (
          <p className={passwordMessage.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"}>
            {passwordMessage.text}
          </p>
        )}

        <Button type="submit" variant="outline" disabled={changingPassword}>
          {changingPassword ? "Changing..." : "Change Password"}
        </Button>
      </form>
    </div>
  );
}
