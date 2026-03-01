/**
 * HydroBOS Applet Framework — Shared Types
 *
 * This module defines the canonical type system for the applet runtime:
 * manifests, permissions, ACLs, and the permission-mapper contract.
 * Every new applet MUST conform to these interfaces.
 */

// ────────────────────────────────────────────────────────────────────────────
// Applet Manifest
// ────────────────────────────────────────────────────────────────────────────

/** Unique, kebab-case identifier for an applet (e.g. "seo-optimizer"). */
export type AppletId = string;

/** Version string following semver (e.g. "1.0.0"). */
export type SemVer = string;

/**
 * Every applet ships a manifest that the host shell reads at registration
 * time. It describes the applet, declares required permissions, and tells the
 * gateway how to proxy requests.
 */
export interface AppletManifest {
  /** Unique applet identifier (kebab-case). */
  id: AppletId;
  /** Human-readable name shown in sidebar / admin panel. */
  name: string;
  /** Short description for the applet catalog. */
  description: string;
  /** Semver version string. */
  version: SemVer;
  /** Lucide icon name for sidebar rendering. */
  icon: string;
  /** Base path the gateway prefixes (e.g. "/api/seo"). */
  basePath: string;
  /** Internal service URL the gateway proxies to. */
  serviceUrl: string;
  /** Port the service listens on. */
  port: number;
  /** Permissions this applet declares (used to seed ACLs). */
  permissions: AppletPermissionDef[];
  /** Default role→permission mappings shipped with the applet. */
  defaultRoleMappings: AppletRoleMapping[];
  /** Optional: categories for grouping in the applet catalog. */
  categories?: string[];
  /** Optional: required external API keys (informational). */
  requiredApiKeys?: string[];
  /** Whether the applet is enabled by default on first install. */
  enabledByDefault: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Permissions
// ────────────────────────────────────────────────────────────────────────────

/**
 * A single permission an applet can declare.
 * Format convention: `<appletId>:<resource>:<action>`
 * e.g. "seo:analysis:run", "seo:content:write"
 */
export interface AppletPermissionDef {
  /** Machine-readable permission key. */
  key: string;
  /** Human label for admin UI. */
  label: string;
  /** Longer description shown in permission editor. */
  description: string;
  /** Grouping category within the applet (e.g. "Analysis", "Content"). */
  category: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Role ↔ Permission Mapping (the "Permission Mapper")
// ────────────────────────────────────────────────────────────────────────────

/** Maps a single platform role to a set of applet permissions. */
export interface AppletRoleMapping {
  /** Platform role (matches UserRole from entities/user). */
  role: string;
  /** Permission keys granted to this role for the applet. */
  permissions: string[];
}

/**
 * Persisted record: an admin-configured override for a specific role's applet
 * permissions. Stored in MongoDB by the identity or applet service.
 */
export interface AppletPermissionOverride {
  _id?: string;
  /** Which applet this override belongs to. */
  appletId: AppletId;
  /** Platform role being customized. */
  role: string;
  /** Final resolved permission set (replaces defaults when present). */
  permissions: string[];
  /** Who last changed this override. */
  updatedBy: string;
  updatedAt: string;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Applet Registration (stored in DB)
// ────────────────────────────────────────────────────────────────────────────

export type AppletStatus = 'active' | 'disabled' | 'error' | 'provisioning';

export interface AppletRegistration {
  _id?: string;
  /** Applet manifest id. */
  appletId: AppletId;
  /** Snapshot of the manifest at install time. */
  manifest: AppletManifest;
  /** Current status. */
  status: AppletStatus;
  /** Configuration overrides (e.g. feature flags). */
  config: Record<string, unknown>;
  /** ISO timestamp of first install. */
  installedAt: string;
  /** ISO timestamp of last status change. */
  updatedAt: string;
  /** User who installed/last changed the applet. */
  managedBy: string;
}

// ────────────────────────────────────────────────────────────────────────────
// DTOs
// ────────────────────────────────────────────────────────────────────────────

export interface RegisterAppletDto {
  manifest: AppletManifest;
}

export interface UpdateAppletStatusDto {
  status: AppletStatus;
}

export interface UpdateAppletPermissionsDto {
  role: string;
  permissions: string[];
}
