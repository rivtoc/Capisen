import { useCallback, useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { POLE_OPTIONS, MEMBER_ROLES, type PoleType, type MemberRole } from "@/lib/db-types";
import { FEATURES, FEATURE_LABELS, type Feature } from "@/lib/permissions";
import {
  Camera, Check, ChevronDown, ChevronRight, Eye, EyeOff, Linkedin,
  Loader2, Lock, Search, Shield, Trash2, Users, X,
} from "lucide-react";
import AvatarCropModal from "./AvatarCropModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "profil" | "securite" | "membres";

interface Member {
  id: string;
  full_name: string;
  pole: PoleType;
  role: MemberRole;
  avatar_url: string | null;
  position: string | null;
  bio: string | null;
  linkedin_url: string | null;
  permissions: string[] | null;
}

interface EditState { pole: PoleType; role: MemberRole; permissions: string[]; }

const ROLE_LABELS: Record<string, string> = {
  apprenti:    "Apprenti",
  normal:      "Membre",
  responsable: "Responsable",
  presidence:  "Présidence",
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
        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
};

// ─── Page principale ──────────────────────────────────────────────────────────

interface SettingsPageProps {
  defaultTab?: Tab;
}

const SETTINGS_TAB_KEY = "capisen_settings_tab";

const SettingsPage = ({ defaultTab = "profil" }: SettingsPageProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem(SETTINGS_TAB_KEY);
    if (saved === "profil" || saved === "securite" || saved === "membres") return saved;
    return defaultTab;
  });
  const isPresidence = profile?.role === "presidence";
  const isNouveauMembre = profile?.pole === "nouveau";

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    localStorage.setItem(SETTINGS_TAB_KEY, tab);
  };

  const tabs = [
    { key: "profil" as Tab, label: "Mon profil", icon: <ChevronRight size={14} /> },
    { key: "securite" as Tab, label: "Sécurité", icon: <Shield size={14} /> },
    ...(!isNouveauMembre ? [{ key: "membres" as Tab, label: "Membres", icon: <Users size={14} /> }] : []),
  ];

  return (
    <div className="flex min-h-full">
      {/* ── Sidebar de navigation ── */}
      <aside className="w-52 shrink-0 border-r border-border py-8 px-3 sticky top-0 self-start min-h-[calc(100vh-57px)]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-3">
          Paramètres
        </p>
        <nav className="space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                activeTab === tab.key
                  ? "bg-muted text-foreground font-medium dark:bg-white/[0.09] dark:text-white"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:text-white/50 dark:hover:bg-white/[0.05] dark:hover:text-white/80"
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.key && <ChevronRight size={13} className="opacity-40" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Contenu ── */}
      <div className={`flex-1 py-8 ${activeTab === "membres" ? "px-8" : "px-10 max-w-2xl"}`}>
        {activeTab === "profil" && (
          <ProfilTab user={user} profile={profile} refreshProfile={refreshProfile} />
        )}
        {activeTab === "securite" && (
          <SecuriteTab user={user} />
        )}
        {activeTab === "membres" && !isNouveauMembre && <MembresTab canEdit={isPresidence} />}
      </div>
    </div>
  );
};

// ─── Onglet Mon profil ────────────────────────────────────────────────────────

const ProfilTab = ({
  user,
  profile,
  refreshProfile,
}: {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
  refreshProfile: () => Promise<void>;
}) => {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [position, setPosition] = useState(profile?.position ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form fields if profile loads after initial mount
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPosition(profile.position ?? "");
    setBio(profile.bio ?? "");
    setLinkedinUrl(profile.linkedin_url ?? "");
  }, [profile?.id]);

  const isDirty =
    fullName !== (profile?.full_name ?? "") ||
    position !== (profile?.position ?? "") ||
    bio !== (profile?.bio ?? "") ||
    linkedinUrl !== (profile?.linkedin_url ?? "");

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      setError("Le nom complet ne peut pas être vide.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("profiles").update({
      full_name: fullName.trim(),
      position: position.trim() || null,
      bio: bio.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
    }).eq("id", user.id);
    setSaving(false);
    if (err) {
      setError("Erreur lors de la sauvegarde.");
    } else {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  // Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("L'image ne doit pas dépasser 5 Mo.");
      return;
    }
    setAvatarError(null);
    // Ouvre le modal de crop avec l'image sélectionnée
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    e.target.value = "";
  };

  const handleCropConfirm = useCallback(async (blob: Blob) => {
    if (!user) return;
    setCropSrc(null);
    setUploadingAvatar(true);
    const path = `${user.id}/avatar.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (uploadErr) {
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
  }, [user, refreshProfile]);

  const handleCropCancel = useCallback(() => {
    setCropSrc(null);
  }, []);

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    await refreshProfile();
    setAvatarPreview(null);
    setUploadingAvatar(false);
  };

  const poleLabel = POLE_OPTIONS.find((p) => p.value === profile?.pole)?.label ?? profile?.pole ?? "—";
  const initials = (profile?.full_name ?? "?").slice(0, 2).toUpperCase();

  return (
    <>
    {cropSrc && (
      <AvatarCropModal
        imageSrc={cropSrc}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    )}
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Mon profil</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ces informations sont visibles sur la page équipe du site.
        </p>
      </div>

      {/* Avatar + identité */}
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">{initials}</span>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 size={18} className="animate-spin text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Infos + boutons avatar */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-base truncate">{profile?.full_name ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{ROLE_LABELS[profile?.role ?? ""] ?? "—"} · {poleLabel}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border text-foreground rounded-lg hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              <Camera size={12} />
              {avatarPreview ? "Changer" : "Ajouter une photo"}
            </button>
            {avatarPreview && (
              <button
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} />
                Supprimer
              </button>
            )}
          </div>
          {avatarError && <p className="text-xs text-red-500 mt-1.5">{avatarError}</p>}
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP — max 5 Mo</p>
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Séparateur */}
      <div className="border-t border-border" />

      {/* Champs du formulaire */}
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nom complet</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Prénom Nom"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Poste / Titre</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="ex. Responsable Communication"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="En quelques mots, présentez-vous…"
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="text"
              value={user?.email ?? ""}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Linkedin size={13} className="text-blue-600 dark:text-blue-400" />
              LinkedIn
            </label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="linkedin.com/in/votre-profil"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Pôle</label>
            <input
              type="text"
              value={poleLabel}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Rôle</label>
            <input
              type="text"
              value={ROLE_LABELS[profile?.role ?? ""] ?? "—"}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Pôle et rôle modifiables uniquement par la présidence.</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="pt-1">
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? "Sauvegardé !" : "Enregistrer les modifications"}
        </button>
      </div>
    </div>
    </>
  );
};

// ─── Onglet Sécurité ──────────────────────────────────────────────────────────

const SecuriteTab = ({ user }: { user: ReturnType<typeof useAuth>["user"] }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async () => {
    setError(null);
    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: oldPassword,
    });
    if (signInError) {
      setSaving(false);
      setError("Ancien mot de passe incorrect.");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (updateError) {
      setError("Erreur lors de la mise à jour du mot de passe.");
    } else {
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const filled = oldPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sécurité</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Gérez votre mot de passe.</p>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl border border-border">
          <Lock size={16} className="text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Compte</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="border-t border-border pt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mot de passe actuel</label>
            <PasswordInput value={oldPassword} onChange={setOldPassword} placeholder="Votre mot de passe actuel" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
              <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="Au moins 8 caractères" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirmer</label>
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Répétez le mot de passe" />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleChangePassword}
        disabled={!filled || saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-sm font-semibold rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
        {saved ? "Mot de passe mis à jour !" : "Modifier le mot de passe"}
      </button>
    </div>
  );
};

// ─── InlineSelect ─────────────────────────────────────────────────────────────

const InlineSelect = ({
  value,
  onChange,
  options,
  width = "w-44",
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  width?: string;
}) => {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === value)?.label ?? value;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground hover:bg-muted/50 transition-colors ${width}`}
        >
          <span className="truncate">{label}</span>
          <ChevronDown
            size={12}
            className={`opacity-40 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 bg-card border border-border rounded-xl shadow-xl py-1 outline-none min-w-[180px]"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted/60 ${
                value === opt.value ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check size={12} className="shrink-0 ml-3 opacity-70" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

// ─── Modal profil membre ───────────────────────────────────────────────────────

const MemberProfileModal = ({ member, onClose }: { member: Member; onClose: () => void }) => {
  const poleLabel = POLE_OPTIONS.find((p) => p.value === member.pole)?.label ?? member.pole;
  const initials = member.full_name.slice(0, 2).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Profil du membre</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-5">
          {/* Avatar + nom + poste */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 text-xl font-bold text-muted-foreground">
              {member.avatar_url
                ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-base truncate">{member.full_name}</p>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {member.position || <span className="italic opacity-60">Poste non renseigné</span>}
              </p>
              <span className="inline-block mt-1.5 px-2 py-0.5 text-[11px] font-medium rounded-full bg-muted text-muted-foreground">
                {poleLabel}
              </span>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Bio */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bio</p>
            {member.bio
              ? <p className="text-sm text-foreground leading-relaxed">{member.bio}</p>
              : <p className="text-sm text-muted-foreground italic">Non renseignée.</p>
            }
          </div>

          {/* LinkedIn */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">LinkedIn</p>
            {member.linkedin_url
              ? (
                <a
                  href={member.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Linkedin size={14} />
                  Voir le profil
                </a>
              )
              : <p className="text-sm text-muted-foreground italic">Non renseigné.</p>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Onglet Membres ───────────────────────────────────────────────────────────

const MembresTab = ({ canEdit }: { canEdit: boolean }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, pole, role, avatar_url, position, bio, linkedin_url, permissions")
      .order("full_name")
      .then(({ data, error }) => {
        if (error) {
          supabase
            .from("profiles")
            .select("id, full_name, pole, role, avatar_url, position, bio, linkedin_url")
            .order("full_name")
            .then(({ data: fallback }) => { setMembers((fallback as Member[]) ?? []); setLoading(false); });
        } else {
          setMembers((data as Member[]) ?? []);
          setLoading(false);
        }
      });
  }, []);

  const getEdit = (member: Member): EditState =>
    edits[member.id] ?? { pole: member.pole, role: member.role, permissions: member.permissions ?? [] };

  const setEdit = (id: string, field: keyof EditState, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...getEdit(members.find((m) => m.id === id)!), [field]: value },
    }));
  };

  const togglePermission = (id: string, feature: Feature) => {
    const member = members.find((m) => m.id === id)!;
    const current = getEdit(member).permissions;
    const next = current.includes(feature) ? current.filter((p) => p !== feature) : [...current, feature];
    setEdits((prev) => ({ ...prev, [id]: { ...getEdit(member), permissions: next } }));
  };

  const isDirty = (member: Member) => {
    const e = edits[member.id];
    if (!e) return false;
    if (e.pole !== member.pole || e.role !== member.role) return true;
    const base = (member.permissions ?? []).slice().sort().join(",");
    const edited = e.permissions.slice().sort().join(",");
    return base !== edited;
  };

  const handleDelete = async (member: Member) => {
    setDeleteLoading(member.id);
    const { error } = await supabase.from("profiles").delete().eq("id", member.id);
    setDeleteLoading(null);
    if (!error) {
      setMembers((p) => p.filter((m) => m.id !== member.id));
      setDeletingId(null);
    }
  };

  const handleSave = async (member: Member) => {
    const e = edits[member.id];
    if (!e) return;
    setSaving((p) => ({ ...p, [member.id]: true }));
    const { error } = await supabase.from("profiles").update({ pole: e.pole, role: e.role, permissions: e.permissions }).eq("id", member.id);
    setSaving((p) => ({ ...p, [member.id]: false }));
    if (!error) {
      setMembers((p) => p.map((m) => m.id === member.id ? { ...m, ...e } : m));
      setEdits((p) => { const n = { ...p }; delete n[member.id]; return n; });
      setSaved((p) => ({ ...p, [member.id]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [member.id]: false })), 2000);
    }
  };

  const filtered = members.filter((m) => m.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {selectedMember && (
        <MemberProfileModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Membres</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {canEdit ? "Modifiez le rôle et le pôle de chaque membre." : "Consultez les membres de l'association."}
        </p>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/40 transition"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Aucun membre trouvé.</div>
      ) : (
        <div className="space-y-2">
          {/* En-tête colonnes */}
          <div className="flex items-center gap-4 px-5 pb-1">
            <div className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Membre</div>
            {canEdit ? (
              <>
                <div className="w-44 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Pôle</div>
                <div className="w-36 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Rôle</div>
                <div className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                  Accès supplémentaires
                  <span className="ml-1 normal-case font-normal text-muted-foreground/60">(en plus du rôle)</span>
                </div>
                <div className="w-28 shrink-0" />
              </>
            ) : (
              <div className="w-48 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Pôle · Rôle</div>
            )}
          </div>

          {filtered.map((member) => {
            const isPending = member.pole === "nouveau";

            // ── Vue lecture seule ──────────────────────────────────────────────
            if (!canEdit) {
              const poleLabel = POLE_OPTIONS.find((p) => p.value === member.pole)?.label ?? member.pole;
              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className={`flex items-center gap-4 px-5 py-3 rounded-xl border cursor-pointer transition-colors ${
                    isPending
                      ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/[0.06]"
                      : "border-border bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground uppercase">
                      {member.avatar_url
                        ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                        : member.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                      {member.position && <p className="text-[11px] text-muted-foreground truncate">{member.position}</p>}
                      {isPending && <p className="text-[11px] text-amber-600 dark:text-amber-400">En attente d'attribution</p>}
                    </div>
                  </div>
                  <div className="w-48 shrink-0 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 text-[11px] rounded-full bg-muted text-muted-foreground">{poleLabel}</span>
                    <span className="px-2 py-0.5 text-[11px] rounded-full bg-muted text-muted-foreground">{ROLE_LABELS[member.role]}</span>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30 shrink-0" />
                </div>
              );
            }

            // ── Vue éditable (présidence) ──────────────────────────────────────
            const edit = getEdit(member);
            const dirty = isDirty(member);
            return (
              <div
                key={member.id}
                className={`flex items-center gap-4 px-5 py-3 rounded-xl border transition-colors ${
                  isPending
                    ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/[0.06]"
                    : "border-border bg-card hover:bg-muted/20"
                }`}
              >
                {/* Avatar + nom */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => setSelectedMember(member)}
                    className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground uppercase hover:opacity-80 transition-opacity"
                    title="Voir le profil"
                  >
                    {member.avatar_url
                      ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                      : member.full_name.charAt(0)}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                    {member.position && <p className="text-[11px] text-muted-foreground truncate">{member.position}</p>}
                    {isPending && <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-tight">En attente d'attribution</p>}
                  </div>
                </div>

                {/* Sélecteur pôle */}
                <div className="w-44 shrink-0">
                  <InlineSelect
                    value={edit.pole}
                    onChange={(v) => setEdit(member.id, "pole", v)}
                    options={POLE_OPTIONS}
                    width="w-full"
                  />
                </div>

                {/* Sélecteur rôle */}
                <div className="w-36 shrink-0">
                  <InlineSelect
                    value={edit.role}
                    onChange={(v) => setEdit(member.id, "role", v)}
                    options={MEMBER_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r }))}
                    width="w-full"
                  />
                </div>

                {/* Permissions */}
                <div className="flex-1 shrink-0">
                  {edit.role === "presidence" ? (
                    <span className="text-xs text-muted-foreground italic">Accès total</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {FEATURES.map((f) => {
                        const active = edit.permissions.includes(f);
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => togglePermission(member.id, f)}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                              active
                                ? "bg-foreground text-background border-foreground"
                                : "bg-card text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {FEATURE_LABELS[f]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="w-28 shrink-0 flex items-center justify-end gap-1.5">
                  {deletingId === member.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(member)}
                        disabled={deleteLoading === member.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {deleteLoading === member.id ? <Loader2 size={10} className="animate-spin" /> : null}
                        Confirmer
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
                      >
                        Annuler
                      </button>
                    </>
                  ) : saved[member.id] ? (
                    <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                      <Check size={12} /> Sauvegardé
                    </span>
                  ) : dirty ? (
                    <button
                      onClick={() => handleSave(member)}
                      disabled={saving[member.id]}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50"
                    >
                      {saving[member.id] ? <Loader2 size={11} className="animate-spin" /> : null}
                      Enregistrer
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeletingId(member.id)}
                      className="p-1.5 text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Supprimer le membre"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} membre{filtered.length !== 1 ? "s" : ""}
        {search ? ` trouvé${filtered.length !== 1 ? "s" : ""}` : " au total"}
      </p>
    </div>
  );
};

export default SettingsPage;
