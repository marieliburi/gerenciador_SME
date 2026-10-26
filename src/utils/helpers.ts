import type { CardColor, TaskCategory, TaskPriority } from '../types';
import { CARD_COLORS } from '../types';

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getCardColorClass(color: CardColor | null): string {
  if (!color) return CARD_COLORS.yellow;
  return CARD_COLORS[color] || CARD_COLORS.yellow;
}

export function getCategoryIcon(category: TaskCategory): string {
  switch (category) {
    case 'user_support':
      return 'Headphones';
    case 'system_update':
      return 'RefreshCw';
    default:
      return 'FileText';
  }
}

export function getPriorityInfo(priority: TaskPriority | null): { icon: string; color: string; textColor: string } {
  switch (priority) {
    case 'high':
      return { icon: 'ArrowUp', color: 'bg-red-100', textColor: 'text-red-700' };
    case 'medium':
      return { icon: 'Minus', color: 'bg-yellow-100', textColor: 'text-yellow-700' };
    case 'low':
      return { icon: 'ArrowDown', color: 'bg-green-100', textColor: 'text-green-700' };
    default:
      return { icon: 'Minus', color: 'bg-gray-100', textColor: 'text-gray-500' };
  }
}

export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

export function generateOptimisticId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
