-- 規程カテゴリテーブルを作成
CREATE TABLE IF NOT EXISTS "RegulationCategory" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegulationCategory_pkey" PRIMARY KEY ("id")
);

-- デフォルト7カテゴリを挿入
INSERT INTO "RegulationCategory" ("id", "name", "order") VALUES
  ('rc_basic',    '基本', 1),
  ('rc_mgmt',     '経営', 2),
  ('rc_org',      '組織', 3),
  ('rc_hr',       '人事', 4),
  ('rc_general',  '総務', 5),
  ('rc_finance',  '経理', 6),
  ('rc_ops',      '業務', 7)
ON CONFLICT ("id") DO NOTHING;

-- Regulation テーブルが存在する場合のみ操作
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Regulation'
  ) THEN
    -- 既存の Regulation を削除（カテゴリ未割り当てのため）
    EXECUTE 'DELETE FROM "Regulation"';

    -- categoryId カラムを追加（存在しない場合のみ）
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Regulation' AND column_name = 'categoryId'
    ) THEN
      EXECUTE 'ALTER TABLE "Regulation" ADD COLUMN "categoryId" TEXT NOT NULL DEFAULT ''rc_basic''';
      EXECUTE 'ALTER TABLE "Regulation" ALTER COLUMN "categoryId" DROP DEFAULT';
      EXECUTE 'ALTER TABLE "Regulation" ADD CONSTRAINT "Regulation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RegulationCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE';
    END IF;
  END IF;
END $$;
