export type NavId =
  | 'overview'
  | 'users'
  | 'categories'
  | 'courses'
  | 'discounts'
  | 'sales'
  | 'projects'
  | 'students'
  | 'reports'
  | 'settings'
  | 'appearance'
  // Nuevas secciones de pagos
  | 'instructor-earnings'
  | 'instructor-payment-history'
  | 'instructor-payment-config'
  | 'admin-instructor-payments'
  | 'admin-payment-history'
  | 'admin-commission-settings';

export type NavItem = { id: NavId; label: string; icon: string; };
