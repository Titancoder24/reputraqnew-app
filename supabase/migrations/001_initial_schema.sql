-- ============================================
-- REPUTRAQ DATABASE SCHEMA
-- ============================================

-- 1. PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'brand_manager' CHECK (role IN ('super_admin','admin','brand_manager','pr_lead','marketing_head','agency_partner')),
  org_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. ORGANIZATIONS
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  parent_company TEXT,
  industry_category TEXT,
  regions TEXT[] DEFAULT '{"IN"}',
  languages TEXT[] DEFAULT '{"en"}',
  logo_url TEXT,
  monitoring_active BOOLEAN DEFAULT FALSE,
  scan_frequency_hours INT DEFAULT 6,
  last_scan_at TIMESTAMPTZ,
  next_scan_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES public.organizations(id);

-- 3. COMPETITORS
CREATE TABLE public.competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct','indirect','benchmark')),
  industry_tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SPOKESPERSONS
CREATE TABLE public.spokespersons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. KEYWORDS
CREATE TABLE public.keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('brand','product','spokesperson','campaign','hashtag','competitor')),
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'brand' CHECK (entity_type IN ('brand','competitor')),
  is_active BOOLEAN DEFAULT TRUE,
  last_scanned_at TIMESTAMPTZ,
  total_results INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_keywords_org ON public.keywords(org_id, is_active);

-- 6. SEARCH RESULTS (THE CORE TABLE)
CREATE TABLE public.search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL,
  keyword_id UUID REFERENCES public.keywords(id),
  keyword_text TEXT,
  entity_type TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('news','organic','forum','discussion','social','video','top_story')),
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  snippet TEXT,
  source_name TEXT,
  published_date TEXT,
  thumbnail_url TEXT,
  sentiment TEXT DEFAULT 'Neutral' CHECK (sentiment IN ('Positive','Negative','Neutral','Mixed')),
  sentiment_score FLOAT DEFAULT 0,
  themes TEXT[],
  risk_flag BOOLEAN DEFAULT FALSE,
  mention_type TEXT DEFAULT 'brand' CHECK (mention_type IN ('brand','product','executive','campaign','industry')),
  reach_estimate TEXT DEFAULT 'medium' CHECK (reach_estimate IN ('high','medium','low')),
  region TEXT,
  language TEXT,
  url_hash TEXT NOT NULL,
  raw_json JSONB,
  collected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sr_org_date ON public.search_results(org_id, collected_at DESC);
CREATE INDEX idx_sr_entity ON public.search_results(org_id, entity_type, entity_name, collected_at DESC);
CREATE INDEX idx_sr_sentiment ON public.search_results(org_id, sentiment, collected_at DESC);
CREATE INDEX idx_sr_platform ON public.search_results(org_id, platform, collected_at DESC);
CREATE INDEX idx_sr_source_type ON public.search_results(org_id, source_type, collected_at DESC);
CREATE INDEX idx_sr_url_hash ON public.search_results(org_id, url_hash);
CREATE INDEX idx_sr_scan ON public.search_results(scan_id);
CREATE INDEX idx_sr_risk ON public.search_results(org_id, risk_flag, collected_at DESC) WHERE risk_flag = TRUE;

-- 7. SCANS
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scan_type TEXT DEFAULT 'scheduled' CHECK (scan_type IN ('scheduled','manual','ondemand')),
  status TEXT DEFAULT 'running' CHECK (status IN ('pending','running','completed','failed')),
  keywords_scanned INT DEFAULT 0,
  results_found INT DEFAULT 0,
  new_results INT DEFAULT 0,
  serpapi_calls_used INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);
CREATE INDEX idx_scans_org ON public.scans(org_id, started_at DESC);

-- 8. BRAND SCORES
CREATE TABLE public.brand_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'brand',
  overall_score INT,
  media_volume_score INT,
  positive_sentiment_score INT,
  tier1_coverage_score INT,
  competitor_gap_score INT,
  executive_visibility_score INT,
  industry_leadership_score INT,
  period TEXT DEFAULT 'weekly',
  date_from TIMESTAMPTZ,
  date_to TIMESTAMPTZ,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. REPORTS
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('daily','weekly','monthly','quarterly','annually')),
  date_from TIMESTAMPTZ NOT NULL,
  date_to TIMESTAMPTZ NOT NULL,
  report_json JSONB,
  ai_summary TEXT,
  total_mentions INT,
  positive_count INT,
  negative_count INT,
  neutral_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ALERT RULES
CREATE TABLE public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('negative_article','competitor_positive','tier1_mention','executive_mention','crisis_keyword','mention_spike')),
  channel TEXT NOT NULL CHECK (channel IN ('email','slack','whatsapp','sms')),
  recipients TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. ALERT LOG
CREATE TABLE public.alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id),
  alert_rule_id UUID REFERENCES public.alert_rules(id),
  result_id UUID REFERENCES public.search_results(id),
  channel TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan TEXT CHECK (plan IN ('starter','growth','pro')),
  max_keywords INT NOT NULL DEFAULT 2,
  max_competitors INT NOT NULL DEFAULT 1,
  scan_frequency_hours INT NOT NULL DEFAULT 6,
  features JSONB DEFAULT '{"reports":["weekly"],"chatbot":false,"alerts":["email"],"history_days":30,"custom_searches":5}',
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval','active','suspended','cancelled','expired')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ADMIN SETTINGS
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.admin_settings (key, value) VALUES
  ('serpapi_key', 'be37f404bc81160fa98e2865423bb4db5aec4291a23d7fb1f1fe6eb9e71a9be8'),
  ('gemini_key', 'AIzaSyCX4ke-8dUCKcc8e-oWbinYXF9DAaeBVw0'),
  ('gemini_model', 'gemini-2.5-flash'),
  ('serpapi_plan', 'developer'),
  ('serpapi_monthly_limit', '5000'),
  ('serpapi_used_this_month', '0'),
  ('serpapi_last_reset', NOW()::TEXT);

-- 14. CHAT HISTORY
CREATE TABLE public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spokespersons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users view own org" ON public.organizations FOR ALL USING (id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users view own org data" ON public.search_results FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users view own keywords" ON public.keywords FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users view own competitors" ON public.competitors FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users view own scans" ON public.scans FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users view own reports" ON public.reports FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users view own alerts" ON public.alert_rules FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users view own chat" ON public.chat_history FOR ALL USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admin full access settings" ON public.admin_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Service role full access results" ON public.search_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access scans" ON public.scans FOR ALL USING (true);
