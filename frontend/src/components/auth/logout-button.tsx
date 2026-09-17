"use client";

import { useRouter } from "next/navigation";

import { logout } from "@/lib/auth";
import { clearStoredTokens } from "@/lib/auth-storage";
import { clearAuth } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";

export function LogoutButton() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearStoredTokens();
      dispatch(clearAuth());
      router.replace("/login");
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
    >
      Logout
    </button>
  );
}
