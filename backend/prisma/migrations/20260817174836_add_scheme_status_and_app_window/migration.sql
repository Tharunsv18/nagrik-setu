-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Scheme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "state" TEXT,
    "category" TEXT NOT NULL,
    "benefitsJson" TEXT NOT NULL,
    "eligibilityJson" TEXT NOT NULL,
    "documentsJson" TEXT NOT NULL,
    "applicationMode" TEXT NOT NULL,
    "officialLink" TEXT,
    "deadline" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CURRENT',
    "applicationStartDate" TEXT,
    "applicationEndDate" TEXT,
    "tagsJson" TEXT NOT NULL,
    "popularityScore" REAL NOT NULL DEFAULT 0,
    "launchedYear" INTEGER NOT NULL,
    "rating" REAL,
    "sourceUrl" TEXT,
    "lastVerifiedAt" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Scheme" ("applicationMode", "benefitsJson", "category", "createdAt", "deadline", "department", "documentsJson", "eligibilityJson", "id", "lastVerifiedAt", "launchedYear", "level", "longDescription", "name", "officialLink", "popularityScore", "rating", "shortDescription", "sourceUrl", "state", "tagsJson", "updatedAt") SELECT "applicationMode", "benefitsJson", "category", "createdAt", "deadline", "department", "documentsJson", "eligibilityJson", "id", "lastVerifiedAt", "launchedYear", "level", "longDescription", "name", "officialLink", "popularityScore", "rating", "shortDescription", "sourceUrl", "state", "tagsJson", "updatedAt" FROM "Scheme";
DROP TABLE "Scheme";
ALTER TABLE "new_Scheme" RENAME TO "Scheme";
CREATE INDEX "Scheme_category_idx" ON "Scheme"("category");
CREATE INDEX "Scheme_level_idx" ON "Scheme"("level");
CREATE INDEX "Scheme_status_idx" ON "Scheme"("status");
CREATE INDEX "Scheme_popularityScore_idx" ON "Scheme"("popularityScore");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
