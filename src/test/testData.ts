// Test Data for End-to-End Testing

export const testCustomers = [
  {
    email: 'customer1@test.com',
    password: 'Test123!@#',
    profile: {
      full_name: 'John Customer',
      phone: '555-0101',
      location: 'New York, NY',
      user_type: 'customer'
    }
  },
  {
    email: 'customer2@test.com',
    password: 'Test123!@#',
    profile: {
      full_name: 'Sarah Client',
      phone: '555-0102',
      location: 'Los Angeles, CA',
      user_type: 'customer'
    }
  }
];

export const testProviders = [
  {
    email: 'provider1@test.com',
    password: 'Test123!@#',
    profile: {
      full_name: 'Mike Provider',
      phone: '555-0201',
      location: 'New York, NY',
      user_type: 'provider'
    },
    provider_profile: {
      business_name: 'Elite Renovations',
      business_description: 'Expert home renovation services with 15 years of experience.',
      years_in_business: 15,
      website: 'https://eliterenovations.example.com',
      available: true,
      services: [
        {
          category: 'Kitchen Remodeling',
          rate_type: 'quote',
          rate_range_min: 15000,
          rate_range_max: 50000
        },
        {
          category: 'Bathroom Remodeling',
          rate_type: 'quote',
          rate_range_min: 10000,
          rate_range_max: 30000
        }
      ],
      service_areas: [
        {
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          radius_km: 50
        }
      ]
    }
  },
  {
    email: 'provider2@test.com',
    password: 'Test123!@#',
    profile: {
      full_name: 'Lisa Builder',
      phone: '555-0202',
      location: 'Los Angeles, CA',
      user_type: 'provider'
    },
    provider_profile: {
      business_name: 'Modern Builders',
      business_description: 'Specializing in modern home renovations and additions.',
      years_in_business: 8,
      website: 'https://modernbuilders.example.com',
      available: true,
      services: [
        {
          category: 'Room Addition',
          rate_type: 'quote',
          rate_range_min: 20000,
          rate_range_max: 100000
        },
        {
          category: 'Kitchen Remodeling',
          rate_type: 'quote',
          rate_range_min: 18000,
          rate_range_max: 60000
        }
      ],
      service_areas: [
        {
          city: 'Los Angeles',
          state: 'CA',
          postal_code: '90001',
          radius_km: 40
        }
      ]
    }
  }
];

export const testProjects = [
  {
    name: 'Kitchen Renovation Project',
    description: 'Complete kitchen remodel including new cabinets, countertops, and appliances.',
    start_date: '2025-06-01',
    end_date: '2025-07-15',
    location: 'New York, NY',
    category: 'Kitchen Remodeling',
    budget_min: 20000,
    budget_max: 40000
  },
  {
    name: 'Master Bathroom Upgrade',
    description: 'Luxury master bathroom renovation with walk-in shower and double vanity.',
    start_date: '2025-07-01',
    end_date: '2025-08-15',
    location: 'Los Angeles, CA',
    category: 'Bathroom Remodeling',
    budget_min: 15000,
    budget_max: 25000
  }
];

export const testProposals = [
  {
    quote_amount: 35000,
    start_date: '2025-06-01',
    comments: 'We specialize in high-end kitchen renovations and can complete this project within your timeline.',
    portfolio_items: ['Modern Kitchen Remodel', 'Contemporary Kitchen Design']
  },
  {
    quote_amount: 22000,
    start_date: '2025-07-10',
    comments: 'Our team has extensive experience with bathroom renovations. We can start slightly later but will complete within your timeframe.',
    portfolio_items: ['Luxury Bathroom Renovation', 'Modern Bathroom Design']
  }
];