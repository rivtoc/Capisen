import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { POLE_OPTIONS } from "@/lib/db-types";
import { Check, Eye, EyeOff, Loader2, Camera, Trash2, Linkedin } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  normal: "Membre",
  responsable: "Responsable",
  presidence: "Présidence",
};

// ─── Composant mot de passe ───────────────────────────────────────────────────

const PasswordInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const SettingsProfile = () => {
  const { user, profile, refreshProfile } = useAuth();

  // — Infos profil —
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [position, setPosition] = useState(profile?.position ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);

  const isProfileDirty =
    fullName !== (profile?.full_name ?? "") ||
    position !== (profile?.position ?? "") ||
    bio !== (profile?.bio ?? "") ||
    linkedinUrl !== (profile?.linkedin_url ?? "");

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setErrorProfile(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        position: position.trim() || null,
        bio: bio.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
      })
      .eq("id", user.id);

    setSavingProfile(false);
    if (error) {
      setErrorProfile("Erreur lors de la sauvegarde.");
    } else {
      await refreshProfile();
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2500);
    }
  };

  // — Avatar —
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile?.avatar_url ?? null
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("L'image ne doit pas dépasser 2 Mo.");
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setAvatarError("Erreur lors de l'upload.");
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    await refreshProfile();
    setAvatarPreview(publicUrl);
    setUploadingAvatar(false);
    e.target.value = "";
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    await refreshProfile();
    setAvatarPreview(null);
    setUploadingAvatar(false);
  };

  // — Mot de passe —
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [savedPwd, setSavedPwd] = useState(false);
  const [errorPwd, setErrorPwd] = useState<string | null>(null);

  const handleChangePassword = async () => {
    setErrorPwd(null);
    if (newPassword.length < 8) {
      setErrorPwd("Le nouveau mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorPwd("Les mots de passe ne correspondent pas.");
      return;
    }
    setSavingPwd(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: oldPassword,
    });

    if (signInError) {
      setSavingPwd(false);
      setErrorPwd("Ancien mot de passe incorrect.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);

    if (updateError) {
      setErrorPwd("Erreur lors de la mise à jour du mot de passe.");
    } else {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSavedPwd(true);
      setTimeout(() => setSavedPwd(false), 2500);
    }
  };

  const poleLabel = POLE_OPTIONS.find((p) => p.value === profile?.pole)?.label ?? profile?.pole ?? "—";
  const pwdFormFilled = oldPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0;
  const initials = (profile?.full_name ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-foreground mb-1">Mon profil</h2>
        <p className="text-sm text-muted-foreground">
          Personnalisez votre profil — ces informations seront visibles sur la page équipe.
        </p>
      </div>

      {/* ── Avatar ── */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Photo de profil</h3>
        <div className="flex items-center gap-5">
          {/* Aperçu */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-muted-foreground">{initials}</span>
              )}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Boutons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-border text-foreground rounded-xl hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              <Camera size={14} />
              {avatarPreview ? "Changer la photo" : "Ajouter une photo"}
            </button>
            {avatarPreview && (
              <button
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
                Supprimer
              </button>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG — max 2 Mo</p>
          </div>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        {avatarError && <p className="text-sm text-red-500 mt-3">{avatarError}</p>}
      </div>

      {/* ── Informations ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Informations</h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Nom complet</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Prénom Nom"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Poste / Titre</label>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="ex. Responsable Communication"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
          />
          <p className="text-xs text-muted-foreground">Affiché sur la page équipe du site.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="En quelques mots, présentez-vous…"
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
          />
          <p className="text-xs text-muted-foreground">Max. 280 caractères recommandés.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <input
            type="text"
            value={user?.email ?? ""}
            disabled
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Pôle</label>
            <input
              type="text"
              value={poleLabel}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Rôle</label>
            <input
              type="text"
              value={ROLE_LABELS[profile?.role ?? ""] ?? "—"}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Pôle et rôle modifiables uniquement par la présidence.</p>

        {errorProfile && <p className="text-sm text-red-500">{errorProfile}</p>}

        <button
          onClick={handleSaveProfile}
          disabled={!isProfileDirty || savingProfile}
          className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {savingProfile ? <Loader2 size={15} className="animate-spin" /> : savedProfile ? <Check size={15} /> : null}
          {savedProfile ? "Sauvegardé !" : "Enregistrer"}
        </button>
      </div>

      {/* ── Réseaux sociaux ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Réseaux</h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Linkedin size={14} className="text-blue-600 dark:text-blue-400" />
            LinkedIn
          </label>
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/votre-profil"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
          />
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={!isProfileDirty || savingProfile}
          className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {savingProfile ? <Loader2 size={15} className="animate-spin" /> : savedProfile ? <Check size={15} /> : null}
          {savedProfile ? "Sauvegardé !" : "Enregistrer"}
        </button>
      </div>

      {/* ── Mot de passe ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Changer le mot de passe</h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Mot de passe actuel</label>
          <PasswordInput value={oldPassword} onChange={setOldPassword} placeholder="Votre mot de passe actuel" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
          <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="Au moins 8 caractères" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Confirmer le nouveau mot de passe</label>
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Répétez le nouveau mot de passe" />
        </div>

        {errorPwd && <p className="text-sm text-red-500">{errorPwd}</p>}

        <button
          onClick={handleChangePassword}
          disabled={!pwdFormFilled || savingPwd}
          className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {savingPwd ? <Loader2 size={15} className="animate-spin" /> : savedPwd ? <Check size={15} /> : null}
          {savedPwd ? "Mot de passe mis à jour !" : "Modifier le mot de passe"}
        </button>
      </div>
    </div>
  );
};

export default SettingsProfile;
