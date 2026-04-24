import type {
  ContentRepository,
  ScriptPackageRecord,
  ScriptVersionRecord,
} from "./content-repository.js";

export class InMemoryContentRepository implements ContentRepository {
  private readonly packages = new Map<string, ScriptPackageRecord>();

  async savePackage(record: ScriptPackageRecord): Promise<ScriptPackageRecord> {
    this.packages.set(record.id, record);
    return record;
  }

  async listPackages(): Promise<readonly ScriptPackageRecord[]> {
    return [...this.packages.values()];
  }

  async findPackage(packageId: string): Promise<ScriptPackageRecord | null> {
    return this.packages.get(packageId) ?? null;
  }

  async findVersion(versionId: string): Promise<ScriptVersionRecord | null> {
    for (const scriptPackage of this.packages.values()) {
      const version = scriptPackage.releasedVersions.find((candidate) => candidate.id === versionId);

      if (version) {
        return version;
      }
    }

    return null;
  }
}
