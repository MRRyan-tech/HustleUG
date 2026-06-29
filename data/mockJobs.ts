import { Job } from '../types';

export const mockJobs: Job[] = [
  {
    id: '1',
    title: 'House Cleaner Needed – 1 Day',
    description:
      'Need someone to deep clean a 3-bedroom house in Ntinda. Includes mopping, dusting, and bathroom scrubbing. Bring your own supplies if possible. Work starts at 8am.',
    pay: 25000,
    location: 'Ntinda, Kampala',
    category: 'Cleaning',
    employerName: 'Grace Nakato',
    employerRating: 4.5,
    timePosted: '1 hour ago',
    contact: '+256701234567',
  },
  {
    id: '2',
    title: 'Boda Delivery – Parcels Around Kampala',
    description:
      'Looking for a reliable boda rider to deliver small parcels within Kampala daily. Must know Kampala roads well. We pay per delivery.',
    pay: 60000,
    location: 'Kampala CBD',
    category: 'Delivery',
    employerName: 'Kato Traders Ltd',
    employerRating: 4.0,
    timePosted: '3 hours ago',
    contact: '+256772345678',
  },
  {
    id: '3',
    title: 'Farm Help – Digging & Planting',
    description:
      'Need 3 strong workers to help with planting season on a small farm in Wakiso. Work is 2 days. Food and transport provided.',
    pay: 15000,
    location: 'Wakiso District',
    category: 'Farming',
    employerName: 'Ssali Emmanuel',
    employerRating: 4.8,
    timePosted: '5 hours ago',
    contact: '+256753456789',
  },
  {
    id: '4',
    title: 'Phone Repair Technician',
    description:
      'Looking for someone who can repair Android phones – screen replacements, software fixes. Bring tools. Commission-based work in a busy shop.',
    pay: 80000,
    location: 'Kikuubo, Kampala',
    category: 'Tech',
    employerName: 'MobileFix Uganda',
    employerRating: 3.9,
    timePosted: 'Yesterday',
    contact: '+256712567890',
  },
  {
    id: '5',
    title: 'Construction Casual – 1 Week',
    description:
      'Need 5 casual labourers for foundation work on a residential building. Daily pay. Work starts Monday. Must be physically fit.',
    pay: 20000,
    location: 'Najjera, Kampala',
    category: 'Construction',
    employerName: 'Mutebi Builders',
    employerRating: 4.2,
    timePosted: '2 hours ago',
    contact: '+256701678901',
  },
  {
    id: '6',
    title: 'Shop Attendant – Supermarket',
    description:
      'Need a shop attendant to manage stock and serve customers. Must be polite and honest. 6-day week. Starting immediately.',
    pay: 350000,
    location: 'Mukono Town',
    category: 'Shop Work',
    employerName: 'Mukono Fresh Mart',
    employerRating: 4.3,
    timePosted: '4 hours ago',
    contact: '+256782789012',
  },
  {
    id: '7',
    title: 'Electrician – House Wiring Fix',
    description:
      'Looking for a qualified electrician to fix faulty wiring in a 2-bedroom home. Must bring certification. One-day job, paid on completion.',
    pay: 45000,
    location: 'Kira Town',
    category: 'Repair',
    employerName: 'Patrick Owino',
    employerRating: 4.6,
    timePosted: '6 hours ago',
    contact: '+256753890123',
  },
  {
    id: '8',
    title: 'Data Entry – Office Assistant',
    description:
      'Need someone to type data into Excel sheets for 3 days. Basic computer skills required. Office is in Kololo.',
    pay: 30000,
    location: 'Kololo, Kampala',
    category: 'Tech',
    employerName: 'Horizon Consults',
    employerRating: 4.1,
    timePosted: 'Yesterday',
    contact: '+256712901234',
  },
];

export const categories = [
  'All',
  'Cleaning',
  'Construction',
  'Delivery',
  'Farming',
  'Tech',
  'Repair',
  'Shop Work',
];