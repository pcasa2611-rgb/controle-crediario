'use client'

import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, Building2 } from 'lucide-react'

interface LoginFormProps {
  onLogin: (userData: any) => void
  onToggleMode: () => void
  isRegisterMode: boolean
}

export default function LoginForm({ onLogin, onToggleMode, isRegisterMode }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    businessName: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isRegisterMode) {
        // Validações para registro
        if (formData.password !== formData.confirmPassword) {
          setError('As senhas não coincidem')
          return
        }
        if (formData.password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres')
          return
        }
        if (!formData.name.trim() || !formData.businessName.trim()) {
          setError('Preencha todos os campos obrigatórios')
          return
        }

        // Simular registro
        const userData = {
          id: Date.now().toString(),
          email: formData.email,
          name: formData.name,
          businessName: formData.businessName,
          createdAt: new Date().toISOString(),
          plan: 'trial',
          planExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
        }

        // Salvar no localStorage
        localStorage.setItem('crediario_user', JSON.stringify(userData))
        onLogin(userData)
      } else {
        // Simular login
        const savedUser = localStorage.getItem('crediario_user')
        if (savedUser) {
          const userData = JSON.parse(savedUser)
          if (userData.email === formData.email) {
            onLogin(userData)
          } else {
            setError('Email ou senha incorretos')
          }
        } else {
          setError('Usuário não encontrado. Faça seu cadastro primeiro.')
        }
      }
    } catch (error) {
      setError('Erro ao processar solicitação. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Crediário Pro</h1>
            <p className="text-gray-600">
              {isRegisterMode ? 'Crie sua conta e comece a organizar seu negócio' : 'Entre na sua conta'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome completo *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do negócio *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Nome da sua loja/empresa"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar senha *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Confirme sua senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processando...' : (isRegisterMode ? 'Criar conta' : 'Entrar')}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isRegisterMode ? 'Já tem uma conta?' : 'Não tem uma conta?'}
              <button
                onClick={onToggleMode}
                className="ml-2 text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                {isRegisterMode ? 'Fazer login' : 'Criar conta'}
              </button>
            </p>
          </div>

          {/* Trial Info */}
          {isRegisterMode && (
            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-emerald-700 text-sm text-center">
                🎉 <strong>30 dias grátis</strong> para testar todas as funcionalidades!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}