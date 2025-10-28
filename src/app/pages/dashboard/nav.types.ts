export type NavId =
  | 'overview'
  | 'users'
  | 'carousel-dashboard'
  | 'categories'
  | 'courses'
  | 'discounts'
  | 'sales'
  | 'projects'
  | 'students'
  | 'reports'
  | 'appearance'
  | 'settings'
  | 'admin-instructor-payments'
  | 'admin-payment-history'
  | 'admin-commission-settings'
  | 'admin-bank-verification'
  | 'instructor-earnings'
  | 'instructor-payment-history'
  | 'instructor-payment-config';

export interface NavItem {
  id: NavId;
  label: string;
  icon: string;
}
