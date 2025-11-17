export type NavId =
  | 'executive-dashboard'
  | 'users'
  | 'carousel-dashboard'
  | 'reports'
  | 'categories'
  | 'courses'
  | 'discounts'
  | 'sales'
  | 'projects'
  | 'students'
  | 'appearance'
  | 'settings'
  | 'system-settings'
  | 'admin-instructor-payments'
  | 'admin-payment-history'
  | 'admin-commission-settings'
  | 'admin-bank-verification'
  | 'instructor-earnings'
  | 'instructor-payment-history'
  | 'instructor-payment-config'
  | 'refunds'
  | 'wallets';

export interface NavItem {
  id: NavId;
  label: string;
  icon: string;
  adminOnly?: boolean; // 🔥 Flag para indicar si solo admin puede ver
}
