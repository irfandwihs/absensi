"use client";

import { useEffect, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  FiCalendar,
  FiClock,
  FiHome,
  FiMapPin,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { auth, db } from "../lib/firebase";

export type NavKey = "home" | "attendance" | "recap" | "profile" | "admin";

const navigation = [
  { key: "home", label: "Beranda", href: "/", Icon: FiHome },
  { key: "attendance", label: "Presensi", href: "/presensi", Icon: FiMapPin },
  { key: "recap", label: "Rekap", href: "/rekap", Icon: FiCalendar },
  { key: "profile", label: "Profil", href: "/profile", Icon: FiUser },
  { key: "admin", label: "Admin", href: "/admin", Icon: FiShield },
] as const;

export function AppLayout({ children, active }: { children: ReactNode; active: NavKey }) {
  const pathname = usePathname();
  const [name, setName] = useState("Pengguna");
  const [role, setRole] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setName("Pengguna");
      setRole("");
      return;
    }
    setName(user.displayName || user.email?.split("@")[0] || "Pengguna");
    try {
      const profile = await getDoc(doc(db, "users", user.uid));
      const data = profile.data();
      if (data?.full_name) setName(data.full_name);
      setRole(data?.role === "admin" ? "admin" : "user");
    } catch {
      setRole("");
    }
  }), []);

  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
  const visibleNavigation = navigation.filter((item) => item.key !== "admin" || role === "admin");

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/" className="brand-link" aria-label="Absensi, beranda">
            <span className="brand-mark" aria-hidden="true"><FiClock /></span>
            <span>Absensi</span>
          </Link>
          <nav className="desktop-nav" aria-label="Navigasi utama">
            {visibleNavigation.map(({ key, label, href, Icon }) => (
              <Link key={key} href={href} className={`desktop-nav-item${active === key ? " is-active" : ""}`} aria-current={active === key ? "page" : undefined}>
                <Icon aria-hidden="true" /> {label}
              </Link>
            ))}
          </nav>
          <Link href="/profile" className="header-avatar" aria-label={`Profil: ${name}`}>{initials}</Link>
        </div>
      </header>
      <main className="app-main" key={pathname}>{children}</main>
      <nav className="bottom-nav" aria-label="Navigasi utama">
        {visibleNavigation.map(({ key, label, href, Icon }) => (
          <Link key={key} href={href} className={`bottom-nav-item${active === key ? " is-active" : ""}`} aria-current={active === key ? "page" : undefined}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`ui-card ${className}`}>{children}</section>;
}

export function Button({ children, variant = "primary", size = "default", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger-outline" | "danger-solid"; size?: "default" | "xl" | "sm" }) {
  return <button className={`ui-button button-${variant} button-${size} ${className}`} {...props}>{children}</button>;
}

export function StatusMessage({ children, variant = "info", role }: { children: ReactNode; variant?: "success" | "warning" | "error" | "info"; role?: "status" | "alert" }) {
  const polite = variant === "success" || variant === "info";
  return <div className={`status-message status-${variant}`} role={role || (polite ? "status" : "alert")} aria-live={polite ? "polite" : "assertive"}>{children}</div>;
}

export function Chip({ children, variant = "neutral" }: { children: ReactNode; variant?: "success" | "neutral" | "accent" }) {
  return <span className={`ui-chip chip-${variant}`}>{children}</span>;
}

export function FormField({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) {
  return <div className="form-field"><label htmlFor={htmlFor}>{label}</label>{children}{error && <span className="field-error" id={`${htmlFor}-error`}>{error}</span>}</div>;
}

export function EmptyState({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <div className="empty-state">{icon && <div className="empty-state-icon" aria-hidden="true">{icon}</div>}<p>{children}</p></div>;
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="skeleton-list" aria-label="Memuat data" role="status">{Array.from({ length: rows }).map((_, index) => <span className="skeleton-bar" key={index} />)}</div>;
}

export function PageHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return <div className="page-heading"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>;
}

export function FieldInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`ui-input ${props.className || ""}`} />;
}

export function FieldSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`ui-input ${props.className || ""}`} />;
}
