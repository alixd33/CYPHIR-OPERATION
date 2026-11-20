/**
 * Independent OperationDirector (TDS v2.2.1)
 * - Separates static ActivityNodeDef from mutable ActivityRuntimeState
 * - Validates DAG for dependency cycles
 * - Supports optional, repeatable, skippable nodes & early final report
 * - Enforces idempotent Consequence execution
 */

export class OperationDirector {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
  }

  validateActivityGraph(graph) {
    const nodes = graph?.nodes || {};
    const visiting = new Set();
    const visited = new Set();

    const dfs = (nodeId) => {
      if (visiting.has(nodeId)) return false; // cycle detected
      if (visited.has(nodeId)) return true;
      visiting.add(nodeId);
      const deps = nodes[nodeId]?.unlockConditions?.requiredCompletedNodes || [];
      for (const depId of deps) {
        if (!nodes[depId]) continue;
        if (!dfs(depId)) return false;
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
      return true;
    };

    for (const id of Object.keys(nodes)) {
      if (!dfs(id)) return { valid: false, error: `چرخه وابستگی غیرمجاز در گره ${id}` };
    }
    return { valid: true };
  }

  initActivityStates(casePack, campaignState) {
    if (!campaignState.activityStates) campaignState.activityStates = {};
    for (const [id, def] of Object.entries(casePack.activityGraph.nodes)) {
      if (!campaignState.activityStates[id]) {
        campaignState.activityStates[id] = {
          status: id === casePack.activityGraph.entryNodeId ? 'available' : 'locked',
          completionCount: 0,
          lastUpdated: new Date().toISOString(),
        };
      }
    }
    this.refreshAvailability(casePack, campaignState);
  }

  refreshAvailability(casePack, campaignState) {
    const nodes = casePack.activityGraph.nodes;
    const states = campaignState.activityStates;

    for (const [id, def] of Object.entries(nodes)) {
      const rt = states[id];
      if (!rt) continue;
      if (rt.status === 'completed' && !def.repeatable) continue;

      const cond = def.unlockConditions || {};
      const flagsOk = (cond.requiredFlags || []).every((f) => Boolean(campaignState.worldFlags?.[f]));
      const evOk = (cond.requiredEvidenceIds || []).every((evId) => Boolean(campaignState.evidenceStates?.[evId]?.discoveredAt));
      const nodesOk = (cond.requiredCompletedNodes || []).every((nId) => states[nId]?.status === 'completed');

      if (flagsOk && evOk && nodesOk) {
        if (rt.status === 'locked') {
          rt.status = 'available';
          rt.lastUpdated = new Date().toISOString();
        }
      }
    }
  }

  completeNode(casePack, campaignState, nodeId) {
    const def = casePack.activityGraph.nodes[nodeId];
    const rt = campaignState.activityStates?.[nodeId];
    if (!def || !rt) return;

    rt.status = 'completed';
    rt.completionCount += 1;
    rt.lastUpdated = new Date().toISOString();

    for (const conId of def.onCompleteConsequences || []) {
      this.applyConsequence(casePack, campaignState, conId);
    }
    this.refreshAvailability(casePack, campaignState);
  }

  applyConsequence(casePack, campaignState, consequenceId) {
    const con = casePack.consequences?.[consequenceId];
    if (!con) return { applied: false, reason: 'پیامد یافت نشد.' };

    if (!con.repeatable && campaignState.appliedConsequenceIds.includes(consequenceId)) {
      return { applied: false, reason: 'قبلاً اعمال شده است.' };
    }

    const eff = con.effects || {};
    if (typeof eff.ocDelta === 'number') {
      campaignState.operationalCredits = Math.max(0, Math.min(9999, campaignState.operationalCredits + eff.ocDelta));
    }
    if (typeof eff.scoreDelta === 'number') {
      campaignState.performanceScore = Math.max(0, Math.min(999999, campaignState.performanceScore + eff.scoreDelta));
    }
    if (typeof eff.stabilityDelta === 'number') {
      campaignState.stability = Math.max(0, Math.min(100, campaignState.stability + eff.stabilityDelta));
    }
    if (eff.setFlags) {
      campaignState.worldFlags = { ...campaignState.worldFlags, ...eff.setFlags };
    }
    if (eff.setEndingId) {
      campaignState.endingId = eff.setEndingId;
    }

    if (!campaignState.appliedConsequenceIds.includes(consequenceId)) {
      campaignState.appliedConsequenceIds.push(consequenceId);
    }
    campaignState.consequenceLog.push({
      consequenceId,
      timestamp: new Date().toISOString(),
    });

    this.eventBus?.emit('CONSEQUENCE_APPLIED', { consequenceId, description: con.description });
    return { applied: true, consequence: con };
  }

  markRemainingSkipped(casePack, campaignState) {
    for (const [id, rt] of Object.entries(campaignState.activityStates || {})) {
      if (rt.status === 'locked' || rt.status === 'available' || rt.status === 'active') {
        rt.status = 'skipped';
        rt.lastUpdated = new Date().toISOString();
      }
    }
  }
}
