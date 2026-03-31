import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, User } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name || "");
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Erro ao enviar imagem");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const url = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("user_id", user.id);

    if (updateError) {
      toast.error("Erro ao atualizar avatar");
    } else {
      setAvatarUrl(url);
      toast.success("Avatar atualizado!");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas!");
    }
    setLoading(false);
  };

  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <p className="font-medium">Foto de perfil</p>
              <p className="text-sm text-muted-foreground">Clique para alterar. Máximo 2MB.</p>
              {uploading && <p className="text-xs text-primary mt-1">Enviando...</p>}
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Nome de exibição</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
          </div>

          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-1" />
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
