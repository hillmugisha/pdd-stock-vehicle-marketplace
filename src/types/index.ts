export interface Vehicle {
  id: string;
  stockNumber: string;
  partner: string | null;
  location: string | null;
  oem: string | null;
  orderDate: string | null;
  orderType: string | null;
  orderNumber: string | null;
  vin: string | null;
  year: string | null;
  pacQid: string | null;
  specs: string | null;
  bodyApplication: string | null;
  color: string | null;
  salePrice: string | null;
  targetProduction: string | null;
  orderStatus: string | null;
  eta: string | null;
  recalls: string | null;
  comments: string | null;
  bodyCode: string | null;
  fuelType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  reservations?: Reservation[];
  isReserved?: boolean;
}

export interface Reservation {
  id: string;
  vehicleId: string;
  userId: string;
  reservedBy: string | null;
  reservedFor: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
  user?: User;
}

export interface User {
  id: string;
  supabaseId: string;
  email: string;
  name: string | null;
  company: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFilters {
  years?: string[];
  oems?: string[];
  colors?: string[];
  bodyApplications?: string[];
  fuelTypes?: string[];
  availabilities?: string[];
  search?: string;
}

export interface FilterOptions {
  years: string[];
  oems: string[];
  colors: string[];
  bodyApplications: string[];
  fuelTypes: string[];
  locations: string[];
  statuses: string[];
}
