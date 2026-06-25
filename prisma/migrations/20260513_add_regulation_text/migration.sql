DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Regulation'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Regulation' AND column_name = 'textContent'
    ) THEN
      EXECUTE 'ALTER TABLE "Regulation" ADD COLUMN "textContent" TEXT';
    END IF;
  END IF;
END $$;
