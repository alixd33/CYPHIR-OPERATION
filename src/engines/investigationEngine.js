/**
 * Independent InvestigationEngine (TDS v2.2.1)
 * - Data-driven evidence discovery, segment unlocking & history
 * - Unified HypothesisNode (create, edit, soft-delete preserving history)
 * - Deduplicated links (supports | contradicts | indirect)
 * - Multi-path claim-based evaluate() without hardcoded card-count heuristics
 */

export class InvestigationEngine {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
  }

  addEvidence(campaignState, evidenceDef, sceneId) {
    if (!campaignState.evidenceStates) campaignState.evidenceStates = {};
    const existing = campaignState.evidenceStates[evidenceDef.id];
    if (existing && existing.discoveredAt) {
      return { added: false, evidence: existing };
    }

    const now = new Date().toISOString();
    const record = JSON.parse(JSON.stringify(evidenceDef));
    record.discoveredAt = { sceneId, timestamp: now };
    record.history = [
      ...(record.history || []),
      { timestamp: now, action: 'discovered', details: `کشف در ${sceneId}` },
    ];

    campaignState.evidenceStates[record.id] = record;
    if (!campaignState.unlockedEvidenceIds.includes(record.id)) {
      campaignState.unlockedEvidenceIds.push(record.id);
    }
    if (!campaignState.board.placedIds.includes(record.id)) {
      campaignState.board.placedIds.push(record.id);
      const count = campaignState.board.placedIds.length;
      campaignState.board.positions[record.id] = {
        x: 40 + ((count % 3) * 210),
        y: 45 + Math.floor(count / 3) * 145,
      };
    }

    this.eventBus?.emit('CLUE_DISCOVERED', { evidenceId: record.id, sceneId });
    return { added: true, evidence: record };
  }

  unlockSegment(campaignState, evidenceId, segId) {
    const ev = campaignState.evidenceStates?.[evidenceId];
    if (!ev || !Array.isArray(ev.segments)) return { ok: false, reason: 'مدرک یا بخش مورد نظر یافت نشد.' };
    const seg = ev.segments.find((s) => s.segId === segId);
    if (!seg) return { ok: false, reason: 'بخش رمزگشایی یافت نشد.' };
    if (seg.unlocked) return { ok: true, alreadyUnlocked: true, evidence: ev };

    seg.unlocked = true;
    ev.history.push({
      timestamp: new Date().toISOString(),
      action: 'segment_unlocked',
      details: `رمزگشایی بخش ${segId}`,
    });
    this.eventBus?.emit('EVIDENCE_SEGMENT_UNLOCKED', { evidenceId, segId });
    return { ok: true, evidence: ev };
  }

  createHypothesis(campaignState, title, summary, targetClaimIds = []) {
    const cleanTitle = (title || '').trim();
    if (!cleanTitle) return { ok: false, reason: 'عنوان فرضیه نمی‌تواند خالی باشد.' };
    const now = new Date().toISOString();
    const hyp = {
      id: `HYP-U-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      origin: 'user',
      isUserCreated: true,
      title: cleanTitle,
      summary: (summary || 'نیازمند بررسی شواهد تکمیلی').trim(),
      targetClaimIds: [...targetClaimIds],
      status: 'active',
      statusReason: 'ایجادشده توسط فرمانده',
      deleted: false,
      editHistory: [{ timestamp: now, field: 'create', oldVal: '', newVal: cleanTitle }],
    };
    campaignState.board.hypotheses.push(hyp);
    campaignState.board.placedIds.push(hyp.id);
    const count = campaignState.board.placedIds.length;
    campaignState.board.positions[hyp.id] = {
      x: 50 + ((count % 3) * 210),
      y: 55 + Math.floor(count / 3) * 145,
    };
    this.eventBus?.emit('HYPOTHESIS_CREATED', { hypothesisId: hyp.id });
    return { ok: true, hypothesis: hyp };
  }

  editHypothesis(campaignState, hypId, newTitle, newSummary) {
    const hyp = campaignState.board.hypotheses.find((h) => h.id === hypId && !h.deleted);
    if (!hyp) return { ok: false, reason: 'فرضیه یافت نشد.' };
    const now = new Date().toISOString();
    if (typeof newTitle === 'string' && newTitle.trim() && newTitle.trim() !== hyp.title) {
      hyp.editHistory.push({ timestamp: now, field: 'title', oldVal: hyp.title, newVal: newTitle.trim() });
      hyp.title = newTitle.trim();
    }
    if (typeof newSummary === 'string' && newSummary.trim() !== hyp.summary) {
      hyp.editHistory.push({ timestamp: now, field: 'summary', oldVal: hyp.summary, newVal: newSummary.trim() });
      hyp.summary = newSummary.trim();
    }
    this.eventBus?.emit('HYPOTHESIS_UPDATED', { hypothesisId: hyp.id });
    return { ok: true, hypothesis: hyp };
  }

  deleteHypothesis(campaignState, hypId) {
    const hyp = campaignState.board.hypotheses.find((h) => h.id === hypId);
    if (!hyp) return { ok: false, reason: 'فرضیه یافت نشد.' };
    if (hyp.origin !== 'user' && !hyp.isUserCreated) {
      return { ok: false, reason: 'فرضیه‌های پایه پرونده قابل حذف دستی نیستند؛ می‌توانید آن‌ها را رد کنید.' };
    }
    // Soft delete preserves editHistory & investigation audit trail
    hyp.deleted = true;
    hyp.editHistory.push({
      timestamp: new Date().toISOString(),
      field: 'deleted',
      oldVal: 'false',
      newVal: 'true',
    });
    campaignState.board.placedIds = campaignState.board.placedIds.filter((id) => id !== hypId);
    campaignState.board.connections = campaignState.board.connections.filter(
      (c) => c.fromId !== hypId && c.toId !== hypId
    );
    this.eventBus?.emit('HYPOTHESIS_DELETED', { hypothesisId: hypId });
    return { ok: true };
  }

  linkItems(campaignState, fromId, toId, relation = 'supports', reason = '') {
    if (!fromId || !toId || fromId === toId) {
      return { ok: false, reason: 'دو کارت متفاوت را انتخاب کنید.' };
    }
    if (!['supports', 'contradicts', 'indirect'].includes(relation)) {
      return { ok: false, reason: 'نوع ارتباط نامعتبر است.' };
    }
    const duplicate = campaignState.board.connections.some(
      (c) =>
        c.relation === relation &&
        ((c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId))
    );
    if (duplicate) {
      return { ok: false, reason: 'این ارتباط قبلاً ثبت شده است.' };
    }
    const conn = {
      id: `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fromId,
      toId,
      relation,
      reason,
      createdAt: new Date().toISOString(),
    };
    campaignState.board.connections.push(conn);
    this.eventBus?.emit('BOARD_LINK_CHANGED', { action: 'add', conn });
    return { ok: true, connection: conn };
  }

  unlink(campaignState, connId) {
    campaignState.board.connections = campaignState.board.connections.filter((c) => c.id !== connId);
    this.eventBus?.emit('BOARD_LINK_CHANGED', { action: 'remove', connId });
  }

  getActiveClaimsForEvidence(ev) {
    if (!ev || !ev.discoveredAt) return { factClaims: [], interpClaims: [] };
    const factClaims = [];
    const interpClaims = [];
    for (const seg of ev.segments || []) {
      if (!seg.unlocked) continue;
      if (seg.epistemicLevel === 'confirmed_fact') factClaims.push(...(seg.claims || []));
      else interpClaims.push(...(seg.claims || []));
    }
    return { factClaims, interpClaims };
  }

  /**
   * Deterministic multi-path investigation evaluation (TDS v2.2.1 P0.2)
   */
  evaluate(campaignState, rules, selectedHypothesisId) {
    const evMap = campaignState.evidenceStates || {};
    const conns = campaignState.board.connections || [];
    const hyps = (campaignState.board.hypotheses || []).filter((h) => !h.deleted);
    const targetHyp = hyps.find((h) => h.id === selectedHypothesisId) || null;

    // 1. Gather all discovered active claims
    const allFactClaims = new Set();
    const allInterpClaims = new Set();
    for (const ev of Object.values(evMap)) {
      const { factClaims, interpClaims } = this.getActiveClaimsForEvidence(ev);
      factClaims.forEach((c) => allFactClaims.add(c));
      interpClaims.forEach((c) => allInterpClaims.add(c));
    }

    // 2. Evaluate each hypothesis status
    const issues = [];
    for (const h of hyps) {
      const supportConns = conns.filter((c) => c.relation === 'supports' && (c.toId === h.id || c.fromId === h.id));
      const contraConns = conns.filter((c) => c.relation === 'contradicts' && (c.toId === h.id || c.fromId === h.id));

      let factSupportCount = 0;
      let interpSupportCount = 0;
      for (const sc of supportConns) {
        const otherId = sc.fromId === h.id ? sc.toId : sc.fromId;
        const ev = evMap[otherId];
        if (!ev) continue;
        const { factClaims, interpClaims } = this.getActiveClaimsForEvidence(ev);
        if (factClaims.length > 0) factSupportCount++;
        else if (interpClaims.length > 0) interpSupportCount++;
      }

      let hasFactContra = false;
      for (const cc of contraConns) {
        const otherId = cc.fromId === h.id ? cc.toId : cc.fromId;
        const ev = evMap[otherId];
        if (ev && this.getActiveClaimsForEvidence(ev).factClaims.length > 0) {
          hasFactContra = true;
        }
      }

      if (hasFactContra) {
        h.status = 'refuted';
        h.statusReason = 'با شواهد قطعی رد شده است';
      } else if (factSupportCount > 0) {
        h.status = 'supported';
        h.statusReason = `پشتیبانی‌شده با ${factSupportCount} مدرک قطعی`;
      } else if (interpSupportCount > 0) {
        h.status = 'weakened';
        h.statusReason = 'فقط متکی بر برداشت تفسیری (بدون شاهد قطعی)';
      } else {
        h.status = 'active';
        h.statusReason = 'بدون پشتوانه کافی';
      }
    }

    if (!targetHyp) {
      return {
        quality: 'flawed',
        matchedPathId: null,
        confidence: 0,
        issues: ['هیچ فرضیه‌ای برای گزارش نهایی انتخاب نشده است.'],
      };
    }

    // Reject red herring hypotheses as final answer
    if ((rules.redHerringIds || []).includes(targetHyp.id)) {
      issues.push('فرضیه منتخب بر پایه سرنخ انحرافی بنا شده است.');
      return { quality: 'flawed', matchedPathId: null, confidence: 20, issues };
    }

    // Collect confirmed facts supporting targetHyp (or user hypothesis targeting valid claims)
    const connectedFactClaims = new Set();
    let connectedConfirmedFactCount = 0;
    for (const c of conns) {
      if (c.relation !== 'supports') continue;
      if (c.fromId !== targetHyp.id && c.toId !== targetHyp.id) continue;
      const evId = c.fromId === targetHyp.id ? c.toId : c.fromId;
      const ev = evMap[evId];
      if (!ev) continue;
      const { factClaims } = this.getActiveClaimsForEvidence(ev);
      if (factClaims.length > 0) {
        connectedConfirmedFactCount++;
        factClaims.forEach((cl) => connectedFactClaims.add(cl));
      }
    }

    if (connectedConfirmedFactCount === 0) {
      issues.push('فرضیه منتخب فاقد مدرک قطعی متصل (unsupported) است.');
    }

    // Check recorded contradictions against red herrings
    const recordedContraTargets = new Set();
    for (const c of conns) {
      if (c.relation === 'contradicts') {
        recordedContraTargets.add(c.fromId);
        recordedContraTargets.add(c.toId);
      }
    }

    // Match against ValidProofPaths
    for (const path of rules.validPaths || []) {
      const hasAllClaims = path.requiredClaims.every((req) => connectedFactClaims.has(req));
      const hasEnoughFacts = connectedConfirmedFactCount >= (path.minConfirmedFacts || 1);
      const hasContra = (path.requiredContradictionTargets || []).every((t) => recordedContraTargets.has(t));
      if (hasAllClaims && hasEnoughFacts && hasContra) {
        const result = {
          quality: path.tier, // 'optimal' | 'valid_alternative'
          matchedPathId: path.id,
          confidence: path.confidence,
          issues: [],
        };
        this.eventBus?.emit('BOARD_EVALUATED', result);
        return result;
      }
    }

    if (issues.length === 0) {
      issues.push('شواهد کافی یا تناقض‌های کلیدی برای اثبات کامل این فرضیه متصل نشده است.');
    }
    const flawedResult = { quality: 'flawed', matchedPathId: null, confidence: 35, issues };
    this.eventBus?.emit('BOARD_EVALUATED', flawedResult);
    return flawedResult;
  }
}
