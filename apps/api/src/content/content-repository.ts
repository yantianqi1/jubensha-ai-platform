import type { ScriptPackage } from "@jubensha/dsl";

export interface ScriptVersionRecord {
  readonly id: string;
  readonly semver: string;
  readonly state: "released";
  readonly content: ScriptPackage;
}

export interface ScriptPackageRecord {
  readonly id: string;
  readonly currentDraft: {
    readonly content: ScriptPackage;
  };
  readonly releasedVersions: readonly ScriptVersionRecord[];
}

export interface ContentRepository {
  savePackage(record: ScriptPackageRecord): Promise<ScriptPackageRecord>;
  listPackages(): Promise<readonly ScriptPackageRecord[]>;
  findPackage(packageId: string): Promise<ScriptPackageRecord | null>;
  findVersion(versionId: string): Promise<ScriptVersionRecord | null>;
}
