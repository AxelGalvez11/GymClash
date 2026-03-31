-- Rate limit reports: max 5 per user per day
CREATE OR REPLACE FUNCTION check_report_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM reports
  WHERE reporter_id = NEW.reporter_id
    AND created_at > now() - interval '1 day';

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit: maximum 5 reports per day';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_rate_limit
  BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION check_report_rate_limit();
