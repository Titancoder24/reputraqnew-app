/* ------------------------------------------------------------------ */
/*  Alert trigger checking                                             */
/* ------------------------------------------------------------------ */

interface AlertRule {
  id: string;
  org_id: string;
  trigger_type: string;
  channel: string;
  recipients: string[];
  is_active: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  link: string;
  snippet: string;
  sentiment: string;
  reach_estimate: string;
  mention_type: string;
  risk_flag: boolean;
  keyword: string;
  entity_name: string;
}

interface TriggeredAlert {
  alert_rule_id: string;
  org_id: string;
  trigger_type: string;
  channel: string;
  recipients: string[];
  result_id: string;
  result_title: string;
  result_link: string;
}

export async function checkAlerts(
  supabase: any,
  orgId: string,
  newResults: SearchResult[]
): Promise<TriggeredAlert[]> {
  if (!newResults.length) return [];

  // Fetch active alert rules for this org
  const { data: rules, error } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true);

  if (error || !rules?.length) return [];

  const triggered: TriggeredAlert[] = [];

  for (const result of newResults) {
    for (const rule of rules as AlertRule[]) {
      let shouldTrigger = false;

      switch (rule.trigger_type) {
        case "negative_article":
          shouldTrigger = result.sentiment === "Negative";
          break;

        case "tier1_mention":
          shouldTrigger = result.reach_estimate === "high";
          break;

        case "executive_mention":
          shouldTrigger = result.mention_type === "executive";
          break;

        case "crisis_keyword":
          shouldTrigger = result.risk_flag === true;
          break;

        default:
          break;
      }

      if (shouldTrigger) {
        triggered.push({
          alert_rule_id: rule.id,
          org_id: orgId,
          trigger_type: rule.trigger_type,
          channel: rule.channel,
          recipients: rule.recipients,
          result_id: result.id,
          result_title: result.title,
          result_link: result.link,
        });
      }
    }
  }

  // Log triggered alerts
  if (triggered.length > 0) {
    const logs = triggered.map((t) => ({
      alert_rule_id: t.alert_rule_id,
      org_id: t.org_id,
      trigger_type: t.trigger_type,
      channel: t.channel,
      recipients: t.recipients,
      search_result_id: t.result_id,
      result_title: t.result_title,
      result_link: t.result_link,
      status: "pending",
    }));

    const { error: logError } = await supabase
      .from("alert_log")
      .insert(logs);

    if (logError) {
      console.error("Failed to log alerts:", logError.message);
    }
  }

  return triggered;
}
