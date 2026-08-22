import React, { useState } from 'react';
import { User, Lock, Mail, Image as ImageIcon, Check, X, RefreshCw, Key, Shield } from 'lucide-react';
import { updateProfile, updatePassword, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Character } from '../types';
import { ImageUploadField } from './ImageUploadField';

interface PlayerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdated: (newProfile: UserProfile) => void;
  characters: Character[];
  onLogout: () => void;
}

export function PlayerConfigModal({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
  characters,
  onLogout
}: PlayerConfigModalProps) {
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.photoURL || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [profileError, setProfileError] = useState('');

  if (!isOpen || !userProfile) return null;

  const handleUpdateProfileData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setProfileError('O nome de usuário não pode ficar vazio.');
      return;
    }

    setSavingProfile(true);
    setProfileError('');
    setProfileSuccess(false);

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim(),
          photoURL: avatarUrl || null
        });

        const userRef = doc(db, 'users', userProfile.uid);
        const updatedData = {
          displayName: displayName.trim(),
          photoURL: avatarUrl || null
        };
        await updateDoc(userRef, updatedData);

        const updatedProfile: UserProfile = {
          ...userProfile,
          displayName: displayName.trim(),
          photoURL: avatarUrl || null
        };
        onProfileUpdated(updatedProfile);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error('Erro ao atualizar perfil do jogador:', err);
      setProfileError(err.message || 'Falha ao salvar dados de perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação de senha não coincide.');
      return;
    }

    setSavingPassword(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 3500);
      }
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError('Por segurança, faça login novamente antes de alterar sua senha.');
      } else {
        setPasswordError(err.message || 'Não foi possível alterar a senha.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const isGoogleLogin = auth.currentUser?.providerData.some(p => p.providerId === 'google.com');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-[#0c0c0c] border border-white/15 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/10 border border-orange-500/30 text-orange-500">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-tight text-white">
                Meu Perfil & Configurações de Jogador
              </h2>
              <p className="text-[9px] text-white/50 font-mono">
                Altere seu nome, avatar, senha e credenciais de acesso
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/40 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scroll bg-[#080808]">
          
          {/* Account Status Info */}
          <div className="bg-[#111] border border-white/10 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black border border-white/15 overflow-hidden rounded-full shrink-0">
                <img
                  src={avatarUrl || userProfile.photoURL || 'https://via.placeholder.com/80?text=Avatar'}
                  alt={userProfile.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white uppercase tracking-wider truncate">
                  {userProfile.displayName}
                </p>
                <p className="text-[10px] text-white/40 font-mono truncate">
                  {userProfile.email}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 uppercase">
                {isGoogleLogin ? 'Google Auth' : 'E-mail / Senha'}
              </span>
            </div>
          </div>

          {/* Form 1: Edit Profile (Username & Avatar with Crop tool) */}
          <form onSubmit={handleUpdateProfileData} className="space-y-4 bg-black border border-white/10 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Identidade do Jogador
            </h3>

            {profileError && (
              <div className="p-2 bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs font-mono">
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="p-2 bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Perfil atualizado com sucesso!
              </div>
            )}

            <div>
              <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                Nome de Usuário / Nickname
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Aldor O Valente"
                className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs font-sans focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            {/* Avatar upload with focus & zoom */}
            <ImageUploadField
              label="Avatar / Foto de Perfil"
              value={avatarUrl}
              onChange={setAvatarUrl}
              aspectRatio="square"
              helperText="Clique em 'Ajustar / Zoom' para focar e centralizar seu rosto"
            />

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                {savingProfile ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Salvar Identidade
              </button>
            </div>
          </form>

          {/* Form 2: Change Password (if email auth) */}
          <form onSubmit={handleChangePassword} className="space-y-4 bg-black border border-white/10 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              Segurança & Troca de Senha
            </h3>

            {passwordError && (
              <div className="p-2 bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs font-mono">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-2 bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Senha alterada com sucesso!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/60 font-bold uppercase tracking-wider mb-1">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full bg-[#050505] border border-white/10 px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={savingPassword || !newPassword}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 disabled:opacity-40"
              >
                {savingPassword ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                Atualizar Senha
              </button>
            </div>
          </form>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/40 text-xs font-bold uppercase tracking-wider transition"
          >
            Encerrar Sessão (Sair)
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
