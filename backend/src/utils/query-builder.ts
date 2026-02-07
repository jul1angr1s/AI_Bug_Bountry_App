/**
 * Build a Prisma date range filter for createdAt or any date field.
 */
export function buildDateRangeFilter(
  startDate?: Date | string,
  endDate?: Date | string,
  field = 'createdAt'
): Record<string, { gte?: Date; lte?: Date }> | undefined {
  if (!startDate && !endDate) return undefined;

  const filter: { gte?: Date; lte?: Date } = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate);

  return { [field]: filter };
}

/**
 * Build a Prisma where clause for payment queries with common filters.
 */
export function buildPaymentWhereClause(filters: {
  protocolId?: string;
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  researcherAddress?: string;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filters.protocolId) {
    where.vulnerability = { protocolId: filters.protocolId };
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.researcherAddress) {
    where.researcherAddress = filters.researcherAddress;
  }

  const dateFilter = buildDateRangeFilter(filters.startDate, filters.endDate);
  if (dateFilter) {
    Object.assign(where, dateFilter);
  }

  return where;
}
