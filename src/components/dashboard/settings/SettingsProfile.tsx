import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { POLE_OPTIONS } from "@/lib/db-types";
import { Check, Loader2, Eye, EyeOff } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  normal: "Membre",
  responsable: "Responsable",
  presidence: "Présidence",
};

// Champ mot de passe avec toggle visibilité
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
        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
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

const SettingsProfile = () => {
  const { user, profile } = useAuth();

  // — Infos profil —
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);

  const isDirty = fullName !== (profile?.full_name ?? "");

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setErrorProfile(null);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);

    setSavingProfile(false);
    if (error) {
      setErrorProfile("Erreur lors de la sauvegarde.");
    } else {
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2500);
    }
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

    // 1. Vérifier l'ancien mot de passe via re-authentification
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: oldPassword,
    });

    if (signInError) {
      setSavingPwd(false);
      setErrorPwd("Ancien mot de passe incorrect.");
      return;
    }

    // 2. Mettre à jour le mot de passe
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

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

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-foreground mb-1">Mon profil</h2>
        <p className="text-sm text-muted-foreground">
          Modifiez vos informations personnelles.
        </p>
      </div>

      {/* — Infos — */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Informations</h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Nom complet</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Prénom Nom"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <input
            type="text"
            value={user?.email ?? ""}
            disabled
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-muted-foreground cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Pôle</label>
            <input
              type="text"
              value={poleLabel}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Rôle</label>
            <input
              type="text"
              value={ROLE_LABELS[profile?.role ?? ""] ?? "—"}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Pôle et rôle modifiables uniquement par la présidence.</p>

        {errorProfile && <p className="text-sm text-red-500">{errorProfile}</p>}

        <button
          onClick={handleSaveProfile}
          disabled={!isDirty || savingProfile}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {savingProfile ? <Loader2 size={15} className="animate-spin" /> : savedProfile ? <Check size={15} /> : null}
          {savedProfile ? "Sauvegardé !" : "Enregistrer"}
        </button>
      </div>

      {/* — Mot de passe — */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Changer le mot de passe</h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Mot de passe actuel</label>
          <PasswordInput
            value={oldPassword}
            onChange={setOldPassword}
            placeholder="Votre mot de passe actuel"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Au moins 8 caractères"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Confirmer le nouveau mot de passe</label>
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Répétez le nouveau mot de passe"
          />
        </div>

        {errorPwd && <p className="text-sm text-red-500">{errorPwd}</p>}

        <button
          onClick={handleChangePassword}
          disabled={!pwdFormFilled || savingPwd}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {savingPwd ? <Loader2 size={15} className="animate-spin" /> : savedPwd ? <Check size={15} /> : null}
          {savedPwd ? "Mot de passe mis à jour !" : "Modifier le mot de passe"}
        </button>
      </div>
    </div>
  );
};

export default SettingsProfile;
