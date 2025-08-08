import React, { createContext, useContext, useEffect, useState } from 'react'
import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import resourcesToBackend from 'i18next-resources-to-backend'

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(resourcesToBackend((language: string, namespace: string) => {
    // Dynamically load translation files
    return import(`../locales/${language}/${namespace}.json`)
  }))
  .init({
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already handles XSS
    },

    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'widgets', 'errors'],

    // React options
    react: {
      bindI18n: 'languageChanged',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em'],
      useSuspense: false,
    },
  })

interface I18nContextType {
  language: string
  setLanguage: (language: string) => void
  t: (key: string, options?: any) => string
  isRTL: boolean
  languages: Array<{ code: string; name: string; nativeName: string }>
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

interface I18nProviderProps {
  children: React.ReactNode
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const { t, i18n: i18nInstance } = useTranslation()
  const [isReady, setIsReady] = useState(false)

  // Supported languages
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  ]

  // RTL languages
  const rtlLanguages = ['ar', 'he', 'fa', 'ur']

  const setLanguage = (language: string) => {
    i18nInstance.changeLanguage(language)
  }

  const isRTL = rtlLanguages.includes(i18nInstance.language)

  // Set document direction and lang attribute
  useEffect(() => {
    document.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = i18nInstance.language
  }, [i18nInstance.language, isRTL])

  // Wait for i18n to be ready
  useEffect(() => {
    const checkReady = () => {
      if (i18nInstance.isInitialized) {
        setIsReady(true)
      }
    }

    if (i18nInstance.isInitialized) {
      setIsReady(true)
    } else {
      i18nInstance.on('initialized', checkReady)
      return () => i18nInstance.off('initialized', checkReady)
    }
  }, [i18nInstance])

  // Show loading state while i18n initializes
  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="loading-spinner" />
      </div>
    )
  }

  const contextValue: I18nContextType = {
    language: i18nInstance.language,
    setLanguage,
    t,
    isRTL,
    languages,
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  )
}
