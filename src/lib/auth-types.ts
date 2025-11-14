export interface User {
  id: string
  email: string
  name: string
  businessName: string
  createdAt: string
  plan: 'trial' | 'monthly' | 'yearly'
  planExpiry: string
  isActive: boolean
}

export interface AuthContextType {
  user: User | null
  login: (userData: User) => void
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}