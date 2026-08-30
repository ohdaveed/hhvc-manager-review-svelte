-- Preserve review rows when the four step-by-step corpus slugs become their
-- current public paths. Fail rather than overwrite a destination row.
DO $$
DECLARE
  renames text[][] := ARRAY[
    ARRAY['step-by-step--get-ready-for-a-housing-inspection', 'get-ready-for-a-housing-inspection'],
    ARRAY['step-by-step--get-ready-for-a-follow-up-inspection', 'get-ready-for-a-follow-up-inspection'],
    ARRAY['step-by-step--fix-healthy-housing-and-vector-control-violation', 'fix-healthy-housing-and-vector-control-violation'],
    ARRAY['step-by-step--tenant-steps-after-notice-of-violation', 'tenant-steps-after-notice-of-violation']
  ];
  pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY renames LOOP
    IF EXISTS (SELECT 1 FROM public.pages WHERE path = pair[1])
       AND EXISTS (SELECT 1 FROM public.pages WHERE path = pair[2]) THEN
      RAISE EXCEPTION 'Cannot rename page path %, destination % already exists', pair[1], pair[2];
    END IF;
    UPDATE public.pages SET path = pair[2] WHERE path = pair[1];
  END LOOP;
END $$;
