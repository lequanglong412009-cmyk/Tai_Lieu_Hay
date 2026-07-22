/**
 * Converts Google Drive sharing links to direct image links
 * Supported formats:
 * - https://drive.google.com/file/d/{ID}/view?usp=sharing
 * - https://drive.google.com/open?id={ID}
 * - https://drive.google.com/uc?id={ID}
 */
export function getGoogleDriveThumbnail(url: string): string {
  if (!url) return "";
  if (!url.includes("drive.google.com")) return url;

  try {
    const urlObj = new URL(url);
    let id = "";

    if (url.includes("/file/d/")) {
      const parts = urlObj.pathname.split("/");
      id = parts[parts.indexOf("d") + 1];
    } else if (urlObj.searchParams.has("id")) {
      id = urlObj.searchParams.get("id") || "";
    }

    if (id) {
      return `https://lh3.googleusercontent.com/d/${id}`;
    }
  } catch (e) {
    console.warn("Invalid URL provided to getGoogleDriveThumbnail", e);
  }

  return url;
}

/**
 * Converts Google Drive sharing links to embeddable preview links
 */
export function getGoogleDriveEmbedUrl(url: string): string {
  if (!url) return "";
  if (!url.includes("drive.google.com")) return url;

  try {
    const urlObj = new URL(url);
    let id = "";

    if (url.includes("/file/d/")) {
      const parts = urlObj.pathname.split("/");
      id = parts[parts.indexOf("d") + 1];
    } else if (urlObj.searchParams.has("id")) {
      id = urlObj.searchParams.get("id") || "";
    }

    if (id) {
      return `https://drive.google.com/file/d/${id}/preview`;
    }
  } catch (e) {
    console.warn("Invalid URL provided to getGoogleDriveEmbedUrl", e);
  }

  return url;
}

/**
 * Combines Tailwind classes
 */
export function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

export function getSortWeight(status?: string): number {
  if (status === "New") return 4;
  if (status === "Hot") return 3;
  if (status === "Bestseller") return 2;
  if (status === "Upcoming") return 2;
  return 1;
}

function hasSeconds(value: unknown): value is { seconds: number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  );
}

export function getTimeValue(time: unknown): number {
  if (!time) return 0;
  if (typeof time === "number") return time;
  if (time instanceof Date) return time.getTime();
  if (hasSeconds(time)) return time.seconds * 1000;
  return 0;
}

type TimeLike = number | Date | { seconds?: number };

export function sortItemsByPriorityAndDate<
  T extends { status?: string; createdAt?: TimeLike; updatedAt?: TimeLike },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const weightA = getSortWeight(a.status);
    const weightB = getSortWeight(b.status);

    if (weightA !== weightB) {
      return weightB - weightA; // Higher weight first
    }

    const timeA = Math.max(
      getTimeValue(a.updatedAt),
      getTimeValue(a.createdAt),
    );
    const timeB = Math.max(
      getTimeValue(b.updatedAt),
      getTimeValue(b.createdAt),
    );

    return timeB - timeA; // Newer time first
  });
}
