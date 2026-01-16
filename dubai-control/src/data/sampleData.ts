import { JobStatus } from "@/components/ui/status-pill";

export interface Job {
  id: string;
  location: string;
  address: string;
  cleaner: string;
  cleanerAvatar?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: JobStatus;
  hasProof: boolean;
  hourlyRate?: number;
  flatRate?: number;
  checkInTime?: string;
  checkInGPS?: string;
  checkOutTime?: string;
  checkOutGPS?: string;
  beforePhotos?: string[];
  afterPhotos?: string[];
  checklist?: { item: string; completed: boolean }[];
}

export const locations = [
  { id: "1", name: "Dubai Marina Tower", address: "Marina Walk, Dubai Marina" },
  { id: "2", name: "Business Bay Office", address: "Bay Square, Business Bay" },
  { id: "3", name: "Downtown Residence", address: "Boulevard Point, Downtown Dubai" },
  { id: "4", name: "JBR Apartment", address: "Jumeirah Beach Residence" },
  { id: "5", name: "DIFC Office", address: "Gate Building, DIFC" },
];

export const cleaners = [
  { id: "1", name: "Ahmed Hassan", phone: "+971 50 123 4567" },
  { id: "2", name: "Maria Santos", phone: "+971 55 234 5678" },
  { id: "3", name: "Fatima Al-Rashid", phone: "+971 52 345 6789" },
  { id: "4", name: "John Okonkwo", phone: "+971 56 456 7890" },
];

export const sampleJobs: Job[] = [
  {
    id: "JOB-001",
    location: "Dubai Marina Tower",
    address: "Marina Walk, Dubai Marina",
    cleaner: "Ahmed Hassan",
    date: "2026-01-16",
    startTime: "09:00",
    endTime: "12:00",
    status: "completed",
    hasProof: true,
    hourlyRate: 75,
    checkInTime: "08:58",
    checkInGPS: "25.0763° N, 55.1345° E",
    checkOutTime: "11:52",
    checkOutGPS: "25.0763° N, 55.1345° E",
    beforePhotos: ["/placeholder.svg", "/placeholder.svg"],
    afterPhotos: ["/placeholder.svg", "/placeholder.svg"],
    checklist: [
      { item: "Vacuum all floors", completed: true },
      { item: "Mop kitchen and bathrooms", completed: true },
      { item: "Clean windows and mirrors", completed: true },
      { item: "Dust all surfaces", completed: true },
      { item: "Empty trash bins", completed: true },
      { item: "Sanitize door handles", completed: true },
    ],
  },
  {
    id: "JOB-002",
    location: "Business Bay Office",
    address: "Bay Square, Business Bay",
    cleaner: "Maria Santos",
    date: "2026-01-16",
    startTime: "13:00",
    endTime: "16:00",
    status: "in-progress",
    hasProof: false,
    hourlyRate: 85,
    checkInTime: "12:55",
    checkInGPS: "25.1865° N, 55.2730° E",
    beforePhotos: ["/placeholder.svg"],
    checklist: [
      { item: "Vacuum all floors", completed: true },
      { item: "Mop kitchen and bathrooms", completed: true },
      { item: "Clean windows and mirrors", completed: false },
      { item: "Dust all surfaces", completed: false },
      { item: "Empty trash bins", completed: false },
    ],
  },
  {
    id: "JOB-003",
    location: "Downtown Residence",
    address: "Boulevard Point, Downtown Dubai",
    cleaner: "Fatima Al-Rashid",
    date: "2026-01-16",
    startTime: "10:00",
    endTime: "13:00",
    status: "scheduled",
    hasProof: false,
    flatRate: 250,
  },
  {
    id: "JOB-004",
    location: "JBR Apartment",
    address: "Jumeirah Beach Residence",
    cleaner: "John Okonkwo",
    date: "2026-01-16",
    startTime: "14:00",
    endTime: "17:00",
    status: "issue",
    hasProof: false,
    hourlyRate: 70,
    checkInTime: "14:05",
    checkInGPS: "25.0780° N, 55.1350° E",
  },
  {
    id: "JOB-005",
    location: "DIFC Office",
    address: "Gate Building, DIFC",
    cleaner: "Ahmed Hassan",
    date: "2026-01-16",
    startTime: "08:00",
    endTime: "11:00",
    status: "scheduled",
    hasProof: false,
    hourlyRate: 90,
  },
  {
    id: "JOB-006",
    location: "Dubai Marina Tower",
    address: "Marina Walk, Dubai Marina",
    cleaner: "Maria Santos",
    date: "2026-01-14",
    startTime: "09:00",
    endTime: "12:00",
    status: "completed",
    hasProof: true,
    hourlyRate: 75,
    checkInTime: "08:55",
    checkInGPS: "25.0763° N, 55.1345° E",
    checkOutTime: "11:48",
    checkOutGPS: "25.0763° N, 55.1345° E",
    beforePhotos: ["/placeholder.svg"],
    afterPhotos: ["/placeholder.svg"],
    checklist: [
      { item: "Vacuum all floors", completed: true },
      { item: "Mop kitchen and bathrooms", completed: true },
      { item: "Clean windows and mirrors", completed: true },
      { item: "Dust all surfaces", completed: true },
    ],
  },
];

export const companySettings = {
  name: "SparkClean Services LLC",
  email: "operations@sparkclean.ae",
  phone: "+971 4 123 4567",
  logo: null,
  notificationsEnabled: true,
  ramadanMode: false,
};
