import { randomUUID } from "node:crypto";

export type ContentIdKind = "package" | "version";
export type ContentIdGenerator = (kind: ContentIdKind) => string;

const PACKAGE_ID_PREFIX = "pkg_";
const VERSION_ID_PREFIX = "ver_";
const INITIAL_SEQUENCE = 1;

export function createSequentialContentIdGenerator(): ContentIdGenerator {
  let nextPackageId = INITIAL_SEQUENCE;
  let nextVersionId = INITIAL_SEQUENCE;

  return (kind) => {
    if (kind === "package") {
      const id = `${PACKAGE_ID_PREFIX}${nextPackageId}`;
      nextPackageId += 1;
      return id;
    }

    const id = `${VERSION_ID_PREFIX}${nextVersionId}`;
    nextVersionId += 1;
    return id;
  };
}

export function createRandomContentIdGenerator(): ContentIdGenerator {
  return (kind) => {
    const prefix = kind === "package" ? PACKAGE_ID_PREFIX : VERSION_ID_PREFIX;

    return `${prefix}${randomUUID()}`;
  };
}
