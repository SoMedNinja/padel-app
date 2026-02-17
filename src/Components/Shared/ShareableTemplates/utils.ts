import { formatDate } from '../../../utils/format';

export const safeFormatDate = (dateStr: string | undefined, options: Intl.DateTimeFormatOptions) => {
  if (!dateStr) return '—';
  return formatDate(dateStr, options) || '—';
};
