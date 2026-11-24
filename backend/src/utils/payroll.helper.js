const { formatDateOnly, getBakuMonthStart } = require('./date');

/**
 * İşçinin son maaş bağlanışından (salary_settlements.paid_at) bəri olan
 * cari hesabat dövrü göstəricilərini hesablayır.
 */
function computeWorkerCurrentPeriod(worker, lastSettlement, allClosedLogs, allAdvances) {
  const cutoffMs = lastSettlement ? new Date(lastSettlement.paid_at).getTime() : 0;
  const period_start = lastSettlement
    ? formatDateOnly(lastSettlement.period_end)
    : getBakuMonthStart();

  const matchingLogs = allClosedLogs.filter((log) => {
    const isParticipant =
      log.usta_id === worker.id ||
      (Array.isArray(log.helper_ids) && log.helper_ids.includes(worker.id));
    if (!isParticipant) return false;
    const logTimeMs = new Date(log.updated_at || log.created_at).getTime();
    return logTimeMs > cutoffMs;
  });

  const uniqueDates = new Set(
    matchingLogs.map((l) => formatDateOnly(l.work_date)).filter(Boolean)
  );
  const worked_days = uniqueDates.size;

  const sortedDates = Array.from(uniqueDates).sort((a, b) => (a < b ? 1 : -1));
  const last_worked_date = sortedDates.length > 0 ? sortedDates[0] : null;

  const gross_salary = Number((Number(worker.daily_wage) * worked_days).toFixed(2));

  const total_advances = Number(
    allAdvances
      .filter((a) => {
        if (a.worker_id !== worker.id) return false;
        return new Date(a.created_at).getTime() > cutoffMs;
      })
      .reduce((sum, a) => sum + Number(a.amount), 0)
      .toFixed(2)
  );

  const net_balance = Number((gross_salary - total_advances).toFixed(2));

  return {
    period_start,
    worked_days,
    gross_salary,
    total_advances,
    net_balance,
    last_worked_date,
  };
}

module.exports = {
  computeWorkerCurrentPeriod,
};
