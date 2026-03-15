// The Salesman's Legend League brand colors
export const BRAND_COLORS = {
  primary: '#C62828',
  primaryDark: '#8E0000',
  secondary: '#1E3A5F',
  accent: '#F5F5F5',
  white: '#FFFFFF',
  dark: '#212121',
};

// Chart colors
export const CHART_COLORS = ["#C62828", "#1E3A5F", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4"];
export const SPIFF_COLORS = {
  'APCO X': '#C62828',
  'Samsung': '#1E3A5F',
  'Mitsubishi': '#4CAF50',
  'Surge Protector': '#FF9800',
  'Duct Cleaning': '#9C27B0',
};

// Sales Pipeline Steps
export const PIPELINE_STEPS = [
  { day: 0, label: 'Same Day', subtitle: '1-2 hrs after visit', actions: [
    { id: 'd0_email', type: 'email', name: 'Positioning & Control', subject: 'Thank You for Your Time Today', body: 'Hi [NAME],\n\nThank you again for taking the time to meet with me today and for welcoming me into your home. I truly appreciate the opportunity.\n\nBased on what we discussed, I\'m confident the system we reviewed is the right fit for your home, your comfort, and your long-term savings.\n\nIf any questions come up tonight, feel free to reply or call me directly. I\'m here to make this easy for you.\n\nOnce you\'re ready, we can secure your installation date and take care of everything.\n\nTalk soon.' },
    { id: 'd0_sms', type: 'sms', name: 'Reinforcement', text: 'Hi [NAME], this is Benjamin. Thanks again for your time today \u2014 I really appreciate it. If anything comes up after reviewing the proposal, just text me. I\'m here to make this simple for you.' },
  ]},
  { day: 2, label: 'Day 2', subtitle: 'Momentum Push', actions: [
    { id: 'd2_email', type: 'email', name: 'Soft Close', subject: 'Following Up \u2014 Ready to Reserve Your Date?', body: 'Hi [NAME],\n\nI wanted to follow up and see how you\'re feeling about everything we discussed.\n\nOur install schedule is filling up, and I\'d hate for you to miss the timing that works best for you.\n\nWould you like me to go ahead and reserve your installation date?\n\nLet me know what questions you still have \u2014 I\'m happy to walk through anything again.' },
  ]},
  { day: 4, label: 'Day 4', subtitle: 'Urgency + Incentive', actions: [
    { id: 'd4_sms', type: 'sms', name: 'Trigger', text: 'Hi [NAME], quick question \u2014 if I could make the numbers a little better for you, would you be ready to move forward?' },
    { id: 'd4_email', type: 'email', name: 'Incentive Close ($200)', subject: 'Special Savings Available This Week', body: 'Hi [NAME],\n\nI wanted to reach out personally because I may be able to help a bit more.\n\nIf we move forward this week, I can apply a $200 discount toward your installation.\n\nThat secures your savings and your installation date before things get tighter on the schedule.\n\nIf this helps you feel more comfortable moving forward, just let me know and I\'ll take care of it right away.' },
  ]},
  { day: 6, label: 'Day 6', subtitle: 'Direct Close', actions: [
    { id: 'd6_sms', type: 'sms', name: 'Decision Message', text: 'Hi [NAME], I\'ll be honest \u2014 I\'d really like to earn your business. If there\'s something holding you back, tell me what it is and let\'s solve it. I\'m confident we can make this work for you.' },
  ]},
  { day: 8, label: 'Day 8', subtitle: 'Final Push', actions: [
    { id: 'd8_email', type: 'email', name: 'Professional Pressure', subject: 'One Last Note Before I Update Your File', body: 'Hi [NAME],\n\nI wanted to reach out one last time before I release the pricing and availability we discussed.\n\nI completely understand that this is a big decision \u2014 but I also don\'t want you to lose the current options and scheduling flexibility.\n\nAre we moving forward together?\n\nIf there\'s anything standing in the way, tell me what it is. I\'m here to help you make the right decision.' },
  ]},
];
export const ALL_PIPELINE_ACTIONS = PIPELINE_STEPS.flatMap(s => s.actions);

// Helper to get first name in title case
export const getFirstName = (fullName) => {
  if (!fullName) return '';
  const first = fullName.split(' ')[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

// Pay periods (bi-weekly) with date ranges for detection
export const PAY_PERIODS_DATA = [
  { name: "Dec 25, 2025 - Jan 07, 2026", start: new Date(2025, 11, 25), end: new Date(2026, 0, 7) },
  { name: "Jan 08, 2026 - Jan 21, 2026", start: new Date(2026, 0, 8), end: new Date(2026, 0, 21) },
  { name: "Jan 22, 2026 - Feb 04, 2026", start: new Date(2026, 0, 22), end: new Date(2026, 1, 4) },
  { name: "Feb 05, 2026 - Feb 18, 2026", start: new Date(2026, 1, 5), end: new Date(2026, 1, 18) },
  { name: "Feb 19, 2026 - Mar 04, 2026", start: new Date(2026, 1, 19), end: new Date(2026, 2, 4) },
  { name: "Mar 05, 2026 - Mar 18, 2026", start: new Date(2026, 2, 5), end: new Date(2026, 2, 18) },
  { name: "Mar 19, 2026 - Apr 01, 2026", start: new Date(2026, 2, 19), end: new Date(2026, 3, 1) },
  { name: "Apr 02, 2026 - Apr 15, 2026", start: new Date(2026, 3, 2), end: new Date(2026, 3, 15) },
  { name: "Apr 16, 2026 - Apr 29, 2026", start: new Date(2026, 3, 16), end: new Date(2026, 3, 29) },
  { name: "Apr 30, 2026 - May 13, 2026", start: new Date(2026, 3, 30), end: new Date(2026, 4, 13) },
  { name: "May 14, 2026 - May 27, 2026", start: new Date(2026, 4, 14), end: new Date(2026, 4, 27) },
  { name: "May 28, 2026 - Jun 10, 2026", start: new Date(2026, 4, 28), end: new Date(2026, 5, 10) },
  { name: "Jun 11, 2026 - Jun 24, 2026", start: new Date(2026, 5, 11), end: new Date(2026, 5, 24) },
  { name: "Jun 25, 2026 - Jul 08, 2026", start: new Date(2026, 5, 25), end: new Date(2026, 6, 8) },
  { name: "Jul 09, 2026 - Jul 22, 2026", start: new Date(2026, 6, 9), end: new Date(2026, 6, 22) },
  { name: "Jul 23, 2026 - Aug 05, 2026", start: new Date(2026, 6, 23), end: new Date(2026, 7, 5) },
  { name: "Aug 06, 2026 - Aug 19, 2026", start: new Date(2026, 7, 6), end: new Date(2026, 7, 19) },
  { name: "Aug 20, 2026 - Sep 02, 2026", start: new Date(2026, 7, 20), end: new Date(2026, 8, 2) },
  { name: "Sep 03, 2026 - Sep 16, 2026", start: new Date(2026, 8, 3), end: new Date(2026, 8, 16) },
  { name: "Sep 17, 2026 - Sep 30, 2026", start: new Date(2026, 8, 17), end: new Date(2026, 8, 30) },
  { name: "Oct 01, 2026 - Oct 14, 2026", start: new Date(2026, 9, 1), end: new Date(2026, 9, 14) },
  { name: "Oct 15, 2026 - Oct 28, 2026", start: new Date(2026, 9, 15), end: new Date(2026, 9, 28) },
  { name: "Oct 29, 2026 - Nov 11, 2026", start: new Date(2026, 9, 29), end: new Date(2026, 10, 11) },
  { name: "Nov 12, 2026 - Nov 25, 2026", start: new Date(2026, 10, 12), end: new Date(2026, 10, 25) },
  { name: "Nov 26, 2026 - Dec 09, 2026", start: new Date(2026, 10, 26), end: new Date(2026, 11, 9) },
  { name: "Dec 10, 2026 - Dec 23, 2026", start: new Date(2026, 11, 10), end: new Date(2026, 11, 23) },
  { name: "Dec 24, 2026 - Jan 06, 2027", start: new Date(2026, 11, 24), end: new Date(2027, 0, 6) },
  { name: "Jan 07, 2027 - Jan 20, 2027", start: new Date(2027, 0, 7), end: new Date(2027, 0, 20) },
];

export const PAY_PERIODS = PAY_PERIODS_DATA.map(p => p.name);

export const getCurrentPayPeriod = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const period of PAY_PERIODS_DATA) {
    if (today >= period.start && today <= period.end) {
      return period.name;
    }
  }
  for (let i = PAY_PERIODS_DATA.length - 1; i >= 0; i--) {
    if (today > PAY_PERIODS_DATA[i].end) {
      return PAY_PERIODS_DATA[i].name;
    }
  }
  return PAY_PERIODS_DATA[0].name;
};

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Lead statuses
export const STATUS_OPTIONS = ["PENDING", "SALE", "LOST", "CANCEL_APPOINTMENT", "RESCHEDULED", "CREDIT_REJECT"];
export const STATUS_LABELS = {
  PENDING: "Pending", SALE: "Sold", LOST: "Lost",
  CANCEL_APPOINTMENT: "Cancel Appt", RESCHEDULED: "Rescheduled", CREDIT_REJECT: "Credit Reject",
};
export const STATUS_COLORS = {
  SALE: { bg: 'bg-green-100', text: 'text-green-700', solid: '#22C55E' },
  LOST: { bg: 'bg-red-100', text: 'text-red-700', solid: '#EF4444' },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', solid: '#F59E0B' },
  CANCEL_APPOINTMENT: { bg: 'bg-gray-100', text: 'text-gray-500', solid: '#6B7280' },
  RESCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700', solid: '#3B82F6' },
  CREDIT_REJECT: { bg: 'bg-purple-100', text: 'text-purple-700', solid: '#8B5CF6' },
};

// Unit Type standard options
export const UNIT_TYPE_OPTIONS = [
  "Furnace",
  "Furnace + AC",
  "Furnace + Heat Pump",
  "AC Only",
  "Heat Pump Only",
  "Air Handler + AC",
  "Air Handler + Heat Pump",
  "Air Handler Only",
  "Generator",
  "Boiler",
  "Other",
];

// Manufacturer options for sale conversion
export const MANUFACTURER_OPTIONS = ["Lennox", "Samsung", "Mitsubishi", "Generac", "Other"];

// Generator manufacturer options
export const GENERATOR_MANUFACTURER_OPTIONS = ["Generac", "Kohler", "Other"];

// Accessory options for sale conversion (HVAC)
export const ACCESSORY_OPTIONS = ["Humidifier", "High Efficiency Filter 5\"", "APCO X", "Surge Protector", "Duct Cleaning", "Other"];

// Accessory options for generators
export const GENERATOR_ACCESSORY_OPTIONS = ["Transfer Switch", "Load Center", "Battery Backup", "Maintenance Plan", "Other"];

// Helper to detect if a lead is a generator
export const isGeneratorLead = (lead) => {
  const ut = (lead?.unit_type || '').toLowerCase();
  return ut === 'generator' || ut === 'generac' || ut === 'kohler';
};

// Quick Filter options
export const QUICK_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'week', label: 'Last Week' },
  { value: '2weeks', label: 'Last 2 Weeks' },
  { value: 'current_year', label: 'Current Year' },
  { value: 'last_year', label: 'Last Year' },
];
