import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'fr' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Auth
    'auth.title': 'Camp Guide Dashboard',
    'auth.subtitle': 'Sign in to manage tours and schedules',
    'auth.phone': 'Phone Number',
    'auth.password': 'Password',
    'auth.login': 'Login',
    'auth.logging_in': 'Logging in...',
    'auth.phone_placeholder': '+212661234567',
    'auth.password_placeholder': 'Enter your password',
    'auth.invalid_phone': 'Please enter a valid phone number',
    'auth.invalid_credentials': 'Invalid phone number or password',
    
    // Dashboard
    'dashboard.title': 'Guide Dashboard',
    'dashboard.logout': 'Logout',
    'dashboard.daily_report': 'Daily Report',
    'dashboard.my_groups': 'My Groups',
    'dashboard.availability': 'Availability',
    'dashboard.send_email': 'Send Email',
    'dashboard.issues': 'Issues',
    'dashboard.admin_panel': 'Admin Panel',
    
    // Daily Poll
    'poll.title': 'Daily Activity Report',
    'poll.subtitle': 'Select what you did today',
    'poll.already_voted': 'You have already submitted your report for today',
    'poll.your_selection': 'Your selection',
    'poll.change_selection': 'Change Selection',
    'poll.submit': 'Submit Report',
    'poll.submitting': 'Submitting...',
    'poll.success': 'Report submitted successfully',
    
    // Analytics
    'analytics.total_guides': 'Total Guides',
    'analytics.total_admins': 'Total Admins',
    'analytics.voted_today': 'Voted Today',
    'analytics.emails_today': 'Emails Today',
    'analytics.unavailable': 'Unavailable',
    'analytics.problems': 'Problems',
    'analytics.postponements': 'Postponements',
    'analytics.no_shows': 'No Shows',
    'analytics.trend_7day': '7-Day Activity Trend',
    'analytics.activity_distribution': "Today's Activity Distribution",
    'analytics.reports_by_activity': 'Reports by Activity',
    'analytics.not_voted': "Assigned Guides Who Haven't Voted Today",
    'analytics.all_voted': 'All assigned guides have voted today!',
    'analytics.unavailable_guides': 'Unavailable Guides Today',
    'analytics.all_available': 'All guides are available today',
    'analytics.today_issues': "Today's Issues & Reports",
    'analytics.no_issues': 'No issues or reports today',
    'analytics.problem': 'Problem',
    'analytics.postponement': 'Postponement',
    'analytics.no_show': 'No Show',
    'analytics.booking': 'Booking',
    'analytics.by': 'By',
    'analytics.no_activity_data': 'No activity data for today',
    
    // Issues
    'issues.title': 'Issue Reporting',
    'issues.add_report': 'Add Report',
    'issues.all': 'All',
    'issues.problems': 'Problems',
    'issues.no_shows': 'No Shows',
    'issues.postponements': 'Postponements',
    'issues.booking_ref': 'Booking Reference',
    'issues.description': 'Description',
    'issues.attachments': 'Attachments',
    'issues.submit': 'Submit Issue',
    'issues.delete': 'Delete',
    'issues.confirm_delete': 'Confirm Delete',
    
    // Email
    'email.title': 'Send Pickup Email',
    'email.customer_email': 'Customer Email',
    'email.pickup_time': 'Pickup Time',
    'email.language': 'Language',
    'email.send': 'Send Email',
    'email.sending': 'Sending...',
    'email.success': 'Email sent successfully',
    
    // Availability
    'availability.title': 'My Availability',
    'availability.mark_unavailable': 'Mark as Unavailable',
    'availability.reason': 'Reason',
    'availability.date': 'Date',
    'availability.submit': 'Submit',
    
    // Groups
    'groups.title': 'My Groups',
    'groups.group_number': 'Group',
    'groups.meeting_time': 'Meeting Time',
    'groups.participants': 'Participants',
    'groups.status': 'Status',
    
    // Settings
    'settings.language': 'Language',
    'settings.english': 'English',
    'settings.french': 'French',
    'settings.arabic': 'Arabic',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.no_data': 'No data available',
  },
  fr: {
    // Auth
    'auth.title': 'Tableau de Bord des Guides',
    'auth.subtitle': 'Connectez-vous pour gérer les visites',
    'auth.phone': 'Numéro de Téléphone',
    'auth.password': 'Mot de Passe',
    'auth.login': 'Connexion',
    'auth.logging_in': 'Connexion en cours...',
    'auth.phone_placeholder': '+212661234567',
    'auth.password_placeholder': 'Entrez votre mot de passe',
    'auth.invalid_phone': 'Veuillez entrer un numéro valide',
    'auth.invalid_credentials': 'Numéro ou mot de passe incorrect',
    
    // Dashboard
    'dashboard.title': 'Tableau de Bord',
    'dashboard.logout': 'Déconnexion',
    'dashboard.daily_report': 'Rapport Quotidien',
    'dashboard.my_groups': 'Mes Groupes',
    'dashboard.availability': 'Disponibilité',
    'dashboard.send_email': 'Envoyer Email',
    'dashboard.issues': 'Problèmes',
    'dashboard.admin_panel': 'Panneau Admin',
    
    // Daily Poll
    'poll.title': 'Rapport d\'Activité Quotidien',
    'poll.subtitle': 'Sélectionnez ce que vous avez fait aujourd\'hui',
    'poll.already_voted': 'Vous avez déjà soumis votre rapport',
    'poll.your_selection': 'Votre sélection',
    'poll.change_selection': 'Modifier',
    'poll.submit': 'Soumettre',
    'poll.submitting': 'Envoi en cours...',
    'poll.success': 'Rapport soumis avec succès',
    
    // Analytics
    'analytics.total_guides': 'Total Guides',
    'analytics.total_admins': 'Total Admins',
    'analytics.voted_today': 'Votés Aujourd\'hui',
    'analytics.emails_today': 'Emails Aujourd\'hui',
    'analytics.unavailable': 'Indisponibles',
    'analytics.problems': 'Problèmes',
    'analytics.postponements': 'Reports',
    'analytics.no_shows': 'Absences',
    'analytics.trend_7day': 'Tendance sur 7 Jours',
    'analytics.activity_distribution': 'Distribution des Activités',
    'analytics.reports_by_activity': 'Rapports par Activité',
    'analytics.not_voted': 'Guides qui n\'ont pas voté',
    'analytics.all_voted': 'Tous les guides ont voté!',
    'analytics.unavailable_guides': 'Guides Indisponibles',
    'analytics.all_available': 'Tous les guides sont disponibles',
    'analytics.today_issues': 'Problèmes d\'Aujourd\'hui',
    'analytics.no_issues': 'Aucun problème aujourd\'hui',
    'analytics.problem': 'Problème',
    'analytics.postponement': 'Report',
    'analytics.no_show': 'Absence',
    'analytics.booking': 'Réservation',
    'analytics.by': 'Par',
    'analytics.no_activity_data': 'Aucune donnée d\'activité',
    
    // Issues
    'issues.title': 'Signalement de Problèmes',
    'issues.add_report': 'Ajouter',
    'issues.all': 'Tous',
    'issues.problems': 'Problèmes',
    'issues.no_shows': 'Absences',
    'issues.postponements': 'Reports',
    'issues.booking_ref': 'Référence de Réservation',
    'issues.description': 'Description',
    'issues.attachments': 'Pièces Jointes',
    'issues.submit': 'Soumettre',
    'issues.delete': 'Supprimer',
    'issues.confirm_delete': 'Confirmer la Suppression',
    
    // Email
    'email.title': 'Envoyer Email de Prise en Charge',
    'email.customer_email': 'Email du Client',
    'email.pickup_time': 'Heure de Prise en Charge',
    'email.language': 'Langue',
    'email.send': 'Envoyer',
    'email.sending': 'Envoi...',
    'email.success': 'Email envoyé avec succès',
    
    // Availability
    'availability.title': 'Ma Disponibilité',
    'availability.mark_unavailable': 'Marquer Indisponible',
    'availability.reason': 'Raison',
    'availability.date': 'Date',
    'availability.submit': 'Soumettre',
    
    // Groups
    'groups.title': 'Mes Groupes',
    'groups.group_number': 'Groupe',
    'groups.meeting_time': 'Heure de Rendez-vous',
    'groups.participants': 'Participants',
    'groups.status': 'Statut',
    
    // Settings
    'settings.language': 'Langue',
    'settings.english': 'Anglais',
    'settings.french': 'Français',
    'settings.arabic': 'Arabe',
    
    // Common
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.add': 'Ajouter',
    'common.search': 'Rechercher',
    'common.no_data': 'Aucune donnée disponible',
  },
  ar: {
    // Auth
    'auth.title': 'لوحة تحكم المرشدين',
    'auth.subtitle': 'سجل دخولك لإدارة الجولات',
    'auth.phone': 'رقم الهاتف',
    'auth.password': 'كلمة السر',
    'auth.login': 'تسجيل الدخول',
    'auth.logging_in': 'جاري التسجيل...',
    'auth.phone_placeholder': '+212661234567',
    'auth.password_placeholder': 'أدخل كلمة السر',
    'auth.invalid_phone': 'أدخل رقم هاتف صحيح',
    'auth.invalid_credentials': 'رقم الهاتف أو كلمة السر غير صحيحة',
    
    // Dashboard
    'dashboard.title': 'لوحة التحكم',
    'dashboard.logout': 'تسجيل الخروج',
    'dashboard.daily_report': 'التقرير اليومي',
    'dashboard.my_groups': 'مجموعاتي',
    'dashboard.availability': 'التوفر',
    'dashboard.send_email': 'إرسال إيميل',
    'dashboard.issues': 'المشاكل',
    'dashboard.admin_panel': 'لوحة الأدمن',
    
    // Daily Poll
    'poll.title': 'التقرير اليومي للنشاط',
    'poll.subtitle': 'اختر ما قمت به اليوم',
    'poll.already_voted': 'لقد أرسلت تقريرك لهذا اليوم',
    'poll.your_selection': 'اختيارك',
    'poll.change_selection': 'تغيير الاختيار',
    'poll.submit': 'إرسال التقرير',
    'poll.submitting': 'جاري الإرسال...',
    'poll.success': 'تم إرسال التقرير بنجاح',
    
    // Analytics
    'analytics.total_guides': 'المرشدين',
    'analytics.total_admins': 'الأدمن',
    'analytics.voted_today': 'صوتوا اليوم',
    'analytics.emails_today': 'الإيميلات',
    'analytics.unavailable': 'غير متاحين',
    'analytics.problems': 'المشاكل',
    'analytics.postponements': 'التأجيلات',
    'analytics.no_shows': 'عدم الحضور',
    'analytics.trend_7day': 'اتجاه النشاط لـ 7 أيام',
    'analytics.activity_distribution': 'توزيع النشاط اليوم',
    'analytics.reports_by_activity': 'التقارير حسب النشاط',
    'analytics.not_voted': 'المرشدون الذين لم يصوتوا اليوم',
    'analytics.all_voted': '🎉 جميع المرشدين صوتوا اليوم!',
    'analytics.unavailable_guides': 'المرشدون غير المتاحين اليوم',
    'analytics.all_available': '✅ جميع المرشدين متاحون اليوم',
    'analytics.today_issues': 'المشاكل والتقارير اليوم',
    'analytics.no_issues': '✅ لا توجد مشاكل أو تقارير اليوم',
    'analytics.problem': 'مشكلة',
    'analytics.postponement': 'تأجيل',
    'analytics.no_show': 'عدم حضور',
    'analytics.booking': 'الحجز',
    'analytics.by': 'بواسطة',
    'analytics.no_activity_data': 'لا توجد بيانات نشاط اليوم',
    
    // Issues
    'issues.title': 'الإبلاغ عن المشاكل',
    'issues.add_report': 'إضافة تقرير',
    'issues.all': 'الكل',
    'issues.problems': 'المشاكل',
    'issues.no_shows': 'عدم الحضور',
    'issues.postponements': 'التأجيلات',
    'issues.booking_ref': 'رقم الحجز',
    'issues.description': 'الوصف',
    'issues.attachments': 'المرفقات',
    'issues.submit': 'إرسال',
    'issues.delete': 'حذف',
    'issues.confirm_delete': 'تأكيد الحذف',
    
    // Email
    'email.title': 'إرسال إيميل الاستلام',
    'email.customer_email': 'إيميل العميل',
    'email.pickup_time': 'وقت الاستلام',
    'email.language': 'اللغة',
    'email.send': 'إرسال',
    'email.sending': 'جاري الإرسال...',
    'email.success': 'تم إرسال الإيميل بنجاح',
    
    // Availability
    'availability.title': 'توفري',
    'availability.mark_unavailable': 'تحديد غير متاح',
    'availability.reason': 'السبب',
    'availability.date': 'التاريخ',
    'availability.submit': 'إرسال',
    
    // Groups
    'groups.title': 'مجموعاتي',
    'groups.group_number': 'المجموعة',
    'groups.meeting_time': 'وقت اللقاء',
    'groups.participants': 'المشاركين',
    'groups.status': 'الحالة',
    
    // Settings
    'settings.language': 'اللغة',
    'settings.english': 'الإنجليزية',
    'settings.french': 'الفرنسية',
    'settings.arabic': 'العربية',
    
    // Common
    'common.loading': 'جاري التحميل...',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.confirm': 'تأكيد',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.add': 'إضافة',
    'common.search': 'بحث',
    'common.no_data': 'لا توجد بيانات',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'ar';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
